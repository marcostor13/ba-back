import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';
import { ApproveQuoteDto } from './dto/approve-quote.dto';
import { SendQuoteDto } from './dto/send-quote.dto';
import { Quote, QuoteStatus, QuoteCategory } from './schemas/quote.schema';
import { Project } from '../project/schemas/project.schema';
import { Customer } from '../customer/entities/customer.entity';
import { Company } from '../company/schemas/company.schema';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/schemas/notification.schema';
import { StatusHistoryService } from '../status-history/status-history.service';
import { UploadService } from '../upload/upload.service';
import * as puppeteer from 'puppeteer';
import * as sharp from 'sharp';

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly mailService: MailService,
    private readonly statusHistoryService: StatusHistoryService,
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService,
  ) { }

  async create(dto: CreateQuoteRequestDto): Promise<Quote> {
    // Validar que el proyecto exista
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const project = await this.projectModel.findById(dto.projectId).lean().exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    // Validar que el proyecto pertenezca a la misma compañía
    if (project.companyId.toString() !== dto.companyId) {
      throw new BadRequestException('Project companyId does not match quote companyId');
    }

    const quoteData: Record<string, unknown> = {
      customerId: new Types.ObjectId(dto.customerId),
      companyId: new Types.ObjectId(dto.companyId),
      projectId: new Types.ObjectId(dto.projectId),
      experience: dto.experience,
      category: dto.category,
      userId: new Types.ObjectId(dto.userId),
      versionNumber: dto.versionNumber,
      totalPrice: dto.totalPrice,
      status: dto.status || QuoteStatus.DRAFT,
    };

    if (dto.kitchenInformation) quoteData.kitchenInformation = dto.kitchenInformation;
    if (dto.bathroomInformation) quoteData.bathroomInformation = dto.bathroomInformation;
    if (dto.basementInformation) quoteData.basementInformation = dto.basementInformation;
    if (dto.additionalWorkInformation) quoteData.additionalWorkInformation = dto.additionalWorkInformation;
    if (dto.countertopsFiles) quoteData.countertopsFiles = dto.countertopsFiles;
    if (dto.backsplashFiles) quoteData.backsplashFiles = dto.backsplashFiles;
    if (dto.notes) quoteData.notes = dto.notes;
    if (dto.materials !== undefined) quoteData.materials = dto.materials;

    // Check if this is a Change Order (i.e., there is already an approved version for this project/category)
    if (dto.versionNumber > 1) {
      const hasApprovedVersion = await this.quoteModel.exists({
        projectId: new Types.ObjectId(dto.projectId),
        category: dto.category,
        status: { $in: [QuoteStatus.APPROVED, QuoteStatus.IN_PROGRESS, QuoteStatus.COMPLETED] }
      });
      
      if (hasApprovedVersion) {
        quoteData.isChangeOrder = true;
      }
    }

    const created = await this.quoteModel.create(quoteData);

    // Deactivate all previous quotes for this project (make them read-only)
    await this.quoteModel.updateMany(
      {
        projectId: new Types.ObjectId(dto.projectId),
        _id: { $ne: created._id },
        isActive: true,
      },
      { $set: { isActive: false } },
    );

    // Record initial status
    await this.statusHistoryService.recordTransition({
      entityId: created._id.toString(),
      entityType: 'quote',
      toStatus: created.status,
      userId: dto.userId,
      companyId: dto.companyId,
    });

    // Fetch dependencies for PDF/Email
    const [customer, company] = await Promise.all([
      this.customerModel.findById(dto.customerId).lean().exec(),
      this.companyModel.findById(dto.companyId).lean().exec(),
    ]);

    // If created as SENT (or APPROVED), generate and store PDF immediately
    if (created.status === QuoteStatus.SENT || created.status === QuoteStatus.APPROVED) {
      if (project && customer && company) {
        await this.ensurePdfUrl(created, project as unknown as Project, customer as unknown as Customer, company as unknown as Company);
      }
    }

    const quote = created.toObject() as Quote;

    // Enviar email con PDF adjunto de forma asíncrona
    // Nota: sendQuoteCreatedEmail buscará customer/company de nuevo si no se los pasamos, 
    // pero como es privado y existente, dejémoslo como está o refactorizémoslo si es necesario.
    // Por ahora, para minimizar cambios, dejamos que sendQuoteCreatedEmail haga sus fetch internamente 
    // o podríamos pasárselos si modificamos la firma.
    // Para simplificar, dejaremos que sendQuoteCreatedEmail funcione como antes (hará fetch extra), 
    // pero optimizaremos en el futuro.
    void this.sendQuoteCreatedEmail(quote, created._id.toString(), project).catch((error) => {
      this.logger.error(`Error al enviar el email de quote creada: ${error.message}`, error.stack);
    });

    return quote;
  }

  private async ensurePdfUrl(
    quoteDoc: any,
    project: Project,
    customer: Customer,
    company: Company
  ): Promise<string | null> {
    try {
      const pdfBuffer = await this.generateQuotePdfBuffer({
        quote: quoteDoc.toObject ? quoteDoc.toObject() : quoteDoc,
        quoteId: quoteDoc._id.toString(),
        project,
        customer,
        company,
      });

      const fileName = `quotes/${(project as any)._id}/quote-${quoteDoc.versionNumber}-${quoteDoc._id}.pdf`;
      const pdfUrl = await this.uploadService.uploadFileBuffer(pdfBuffer, fileName, 'application/pdf');
      
      if (typeof quoteDoc.save === 'function') {
        quoteDoc.pdfUrl = pdfUrl;
        await quoteDoc.save();
      }
      
      this.logger.log(`PDF generated and uploaded for quote ${quoteDoc._id}: ${pdfUrl}`);
      return pdfUrl;
    } catch (error) {
      this.logger.error(`Failed to generate/upload PDF for quote ${quoteDoc._id}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async sendQuoteCreatedEmail(
    quote: Quote,
    quoteId: string,
    project: Project,
  ): Promise<void> {
    const [customer, company] = await Promise.all([
      this.customerModel.findById(quote.customerId).lean().exec(),
      this.companyModel.findById(quote.companyId).lean().exec(),
    ]);

    const html = await this.buildQuoteEmailHtml({ quote, quoteId, project, customer, company });
    const pdfBuffer = await this.generateQuotePdfBuffer({
      quote,
      quoteId,
      project,
      customer,
      company,
    });

    await this.mailService.sendMail({
      to: ['Cesarg@spicastudio.art', 'marcostor13@gmail.com', 'marketing@bakitchenandbathdesign.com'],
      subject: `New quote #${quoteId} - ${project?.name ?? 'Project'}`,
      html,
      attachments: [
        {
          filename: `quote-${quoteId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  /**
   * Convierte un string a formato Capitalize (primera letra de cada palabra en mayúscula).
   * "none" -> "None", "in_progress" -> "In Progress"
   */
  private toTitleCase(str: string): string {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  /**
   * Formatea un valor para mostrar en email/PDF. Evita [object Object] para objetos y arrays.
   */
  private formatValueForDisplay(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return this.toTitleCase(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const parts = value.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const text =
            (item as Record<string, unknown>).text ??
            (item as Record<string, unknown>).content ??
            (item as Record<string, unknown>).summary ??
            (item as Record<string, unknown>).description ??
            (item as Record<string, unknown>).comment ??
            (item as Record<string, unknown>).notes ??
            (item as Record<string, unknown>).note ??
            (item as Record<string, unknown>).message ??
            (item as Record<string, unknown>).body;
          return text ? this.formatValueForDisplay(text) : JSON.stringify(item, null, 2);
        }
        return this.formatValueForDisplay(item);
      });
      return parts.filter(Boolean).join('; ');
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const text =
        obj.text ??
        obj.content ??
        obj.summary ??
        obj.description ??
        obj.comment ??
        obj.notes ??
        obj.note ??
        obj.message ??
        obj.body;
      if (text !== undefined) return this.formatValueForDisplay(text);
      
      // Fallback: try to format entries, but if empty or weird, JSON stringify
      const entries = Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '');
      if (entries.length === 0) return JSON.stringify(obj);
      
      return entries
        .map(([k, v]) => `${this.formatKeyForDisplay(k)}: ${this.formatValueForDisplay(v)}`)
        .join(', ');
    }
    return String(value);
  }

  /**
   * Convierte camelCase a "Camel Case" para etiquetas.
   */
  private formatKeyForDisplay(key: string): string {
    return this.toTitleCase(key.replace(/([A-Z])/g, ' $1').trim());
  }

  private async buildQuoteEmailHtml(params: {
    quote: Quote;
    quoteId: string;
    project: Project;
    customer: Customer | null;
    company: Company | null;
  }): Promise<string> {
    const { quote, quoteId, project, customer, company } = params;

    const customerName = this.toTitleCase(
      customer ? `${customer.name || ''} ${customer.lastName || ''}`.trim() || 'N/A' : 'N/A',
    );
    const customerEmail = customer?.email ?? 'N/A';
    const projectName = this.toTitleCase(project?.name ?? 'N/A');
    const companyName = this.toTitleCase((company as { name?: string })?.name ?? 'N/A');

    const infoSections: string[] = [];

    if (quote.kitchenInformation) {
      infoSections.push(this.buildGenericSectionHtml('Kitchen Information', quote.kitchenInformation));
    }
    if (quote.bathroomInformation) {
      infoSections.push(this.buildGenericSectionHtml('Bathroom Information', quote.bathroomInformation));
    }
    if (quote.basementInformation) {
      infoSections.push(this.buildGenericSectionHtml('Basement Information', quote.basementInformation));
    }
    if (quote.additionalWorkInformation) {
      infoSections.push(this.buildGenericSectionHtml('Additional Work Information', quote.additionalWorkInformation));
    }

    const materialsItems =
      quote.materials?.items?.length
        ? quote.materials.items
          .map(
            (item) =>
              `<li><span class="label">Qty</span> <span class="value">${item.quantity}</span> <span class="label">Item</span> <span class="value">${this.escapeHtml(this.toTitleCase(item.description))}</span></li>`,
          )
          .join('')
        : '<li><span class="value">No Specific Materials Listed.</span></li>';

    const notes = quote.notes
      ? `<p class="paragraph">${this.escapeHtml(this.toTitleCase(quote.notes))}</p>`
      : '<p class="paragraph">No Additional Notes.</p>';

    // --- LOGIC FOR FILES SECTION (EMAIL) - Usar URLs presignadas para evitar Access Denied ---
    const allFiles: { label: string; url: string }[] = [];

    if (quote.countertopsFiles?.length) {
      for (let i = 0; i < quote.countertopsFiles.length; i++) {
        const url = quote.countertopsFiles[i];
        const presignedUrl = await this.uploadService.getPresignedDownloadUrl(url);
        allFiles.push({ label: `Countertop File ${i + 1}`, url: presignedUrl });
      }
    }
    if (quote.backsplashFiles?.length) {
      for (let i = 0; i < quote.backsplashFiles.length; i++) {
        const url = quote.backsplashFiles[i];
        const presignedUrl = await this.uploadService.getPresignedDownloadUrl(url);
        allFiles.push({ label: `Backsplash File ${i + 1}`, url: presignedUrl });
      }
    }
    if (quote.materials?.file) {
      const presignedUrl = await this.uploadService.getPresignedDownloadUrl(quote.materials.file);
      allFiles.push({ label: 'Materials File', url: presignedUrl });
    }

    const filesSection =
      allFiles.length > 0
        ? `
        <div class="section">
          <h3 class="section-title">FILES & ATTACHMENTS</h3>
          <div class="files-grid">
            ${allFiles
          .map(
            (f) =>
              '<a href="' +
              f.url +
              '" target="_blank" class="file-card">' +
              '<span class="file-icon">📄</span>' +
              '<span class="file-label">' +
              f.label +
              '</span>' +
              '<span class="file-action">View / Download</span>' +
              '</a>',
          )
          .join('')}
          </div>
        </div>
      `
        : '';

    const detailsSections =
      infoSections.length > 0
        ? `
        <div class="section">
          <h3 class="section-title">DETAILED SCOPE BY AREA</h3>
          ${infoSections.join('<div class="divider"></div>')}
        </div>
      `
        : '';

    return `
      <div class="email-root">
        <style>
          .email-root {
            margin: 0;
            padding: 32px 16px;
            background-color: #EAD1BA; /* Fondo Principal */
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #332F28;
          }
          .card {
            max-width: 720px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
          }
          .card-header {
            background-color: #EAD1BA;
            padding: 20px 28px;
            border-bottom: 1px solid #D9BFA0;
          }
          .brand-title {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #332F28;
          }
          .brand-subtitle {
            margin: 4px 0 0;
            font-size: 12px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #535353;
          }

          .card-body {
            padding: 28px 32px 32px;
          }

          .title {
            margin: 0 0 6px;
            font-size: 22px;
            font-weight: 700;
            color: #332F28;
          }
          .subtitle {
            margin: 0 0 24px;
            font-size: 13px;
            color: #535353;
            line-height: 1.6;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px 24px;
            margin-bottom: 28px;
            padding: 18px 20px;
            background-color: #F9F5F1;
            border-radius: 10px;
            border: 1px solid #E0C9AF;
          }
          .summary-item {
            display: flex;
            flex-direction: column;
          }
          .summary-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #997A63;
            margin-bottom: 2px;
            font-weight: 600;
          }
          .summary-value {
            font-size: 14px;
            font-weight: 600;
            color: #332F28;
          }
          .summary-value-total {
            color: #3A7344;
            font-size: 16px;
          }

          .section {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 1px solid #EAD1BA;
          }
          .section-title {
            margin: 0 0 14px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #332F28;
          }

          .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .info-list li {
            padding: 4px 0;
            font-size: 13px;
            color: #332F28;
          }
          .label {
            font-weight: 600;
            color: #997A63;
            margin-right: 6px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .value {
            color: #332F28;
          }
          .paragraph {
            font-size: 13px;
            line-height: 1.7;
            color: #332F28;
            margin: 0;
          }

          .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 4px;
          }
          .file-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            background-color: #F5F5F5;
            border: 1px solid #E0E0E0;
            border-radius: 8px;
            padding: 12px;
          }
          .file-icon {
            font-size: 22px;
            margin-bottom: 6px;
          }
          .file-label {
            font-size: 12px;
            font-weight: 600;
            color: #332F28;
            text-align: center;
            margin-bottom: 2px;
          }
          .file-action {
            font-size: 10px;
            color: #3A7344;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.08em;
          }

          .divider {
            margin: 22px 0;
            border-top: 1px dashed #D0BBA4;
          }

          @media (max-width: 600px) {
            .card-body {
              padding: 20px 18px 22px;
            }
            .summary-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>

        <div class="card">
          <div class="card-header">
            <h1 class="brand-title">BA Kitchen &amp; Bath Design</h1>
            <p class="brand-subtitle">PROFESSIONAL ESTIMATE REPORT</p>
          </div>

          <div class="card-body">
            <h2 class="title">New Professional Estimate Created</h2>
            <p class="subtitle">
              A new professional estimate report has been generated for this project. Below you will find a summary of the key details. The attached PDF contains the full client-ready document.
            </p>

            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">Total Price</span>
                <span class="summary-value summary-value-total">$${quote.totalPrice.toFixed(2)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Company</span>
                <span class="summary-value">${companyName}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Project</span>
                <span class="summary-value">${projectName}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Category</span>
                <span class="summary-value">${this.toTitleCase(quote.category)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Status</span>
                <span class="summary-value">${this.toTitleCase(quote.status)}</span>
              </div>
            </div>

            <div class="section">
              <h3 class="section-title">Customer</h3>
              <ul class="info-list">
                <li><span class="label">Name</span><span class="value">${customerName}</span></li>
                <li><span class="label">Email</span><span class="value">${customerEmail}</span></li>
              </ul>
            </div>

            <div class="section">
              <h3 class="section-title">Experience / Scope</h3>
              <p class="paragraph">${this.escapeHtml(this.toTitleCase(quote.experience || 'No Experience Description Provided.'))}</p>
            </div>

            <div class="section">
              <h3 class="section-title">Materials</h3>
              <ul class="info-list">
                ${materialsItems}
              </ul>
            </div>

            ${filesSection}

            <div class="section">
              <h3 class="section-title">Notes</h3>
              ${notes}
            </div>

            ${detailsSections}
          </div>
        </div>
      </div>
    `;
  }

  private buildGenericSectionHtml(
    title: string,
    data: Record<string, unknown>,
  ): string {
    const entries = Object.entries(data).filter(
      ([, value]) => value !== undefined && value !== null && value !== '' && value !== false,
    );

    if (!entries.length) {
      return '';
    }

    const items = entries
      .map(([key, value]) => {
        // 1. Check for object with mediaFiles (e.g. additionalComments)
        if (
          typeof value === 'object' &&
          value !== null &&
          'mediaFiles' in value &&
          Array.isArray((value as any).mediaFiles)
        ) {
          const obj = value as any;
          const text =
            obj.text ??
            obj.content ??
            obj.comment ??
            obj.notes ??
            obj.note ??
            obj.message ??
            obj.body;

          const filesHtml = (obj.mediaFiles as string[])
            .map((url, i) => {
              const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].some((ext) =>
                url.toLowerCase().includes(ext),
              );
              const label = isVideo ? 'Video' : 'Image';
              return `<a href="${url}" target="_blank" style="color: #332F28; text-decoration: underline;">View ${label} ${i + 1}</a>`;
            })
            .join(', ');

          let html = '';
          if (text) {
            html += `<li><span class="label">${this.formatKeyForDisplay(key)}</span><span class="value">${this.escapeHtml(this.formatValueForDisplay(text))}</span></li>`;
          }
          if (filesHtml) {
            html += `<li><span class="label">${this.formatKeyForDisplay(key)} Files</span><span class="value">${filesHtml}</span></li>`;
          }
          return html;
        }

        // 2. Check for array of strings (files/URLs)
        if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
           const filesHtml = (value as string[])
            .map((url, i) => {
              // Basic check if it looks like a URL
              if (/^https?:\/\//i.test(url)) {
                 return `<a href="${url}" target="_blank" style="color: #332F28; text-decoration: underline;">View File ${i + 1}</a>`;
              }
              return this.escapeHtml(url);
            })
            .join(', ');
           return `<li><span class="label">${this.formatKeyForDisplay(key)}</span><span class="value">${filesHtml}</span></li>`;
        }

        // Default behavior
        return `<li><span class="label">${this.formatKeyForDisplay(key)}</span><span class="value">${this.escapeHtml(this.formatValueForDisplay(value))}</span></li>`;
      })
      .join('');

    return `
      <h3>${this.toTitleCase(title)}</h3>
      <ul class="info-list">
        ${items}
      </ul>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private isImageUrl(url: string): boolean {
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase() ?? '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'].includes(ext);
  }

  /** Extrae un nombre de archivo amigable desde una URL de S3 (sin query string, timestamps ni UUID prefix). */
  private friendlyFileName(url: string): string {
    try {
      const withoutQuery = url.split('?')[0];
      const parts = withoutQuery.split('/');
      const rawName = decodeURIComponent(parts.pop() ?? withoutQuery);
      const clean = rawName
        .replace(/^(\d+[-])+\d*[_-]?/, '')  // cadenas de dígitos-dígitos-..._
        .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]?/i, '');
      const nameNoExt = (clean || '').replace(/\.[^.]+$/, '');
      if (!clean || nameNoExt.length < 3) {
        return rawName.length > 30 ? '...' + rawName.slice(-27) : rawName;
      }
      return clean;
    } catch {
      return url;
    }
  }

  private async generateQuotePdfBuffer(params: {
    quote: Quote;
    quoteId: string;
    project: Project;
    customer: Customer | null;
    company: Company | null;
  }): Promise<Buffer> {
    const { quote, quoteId, project, customer, company } = params;

    // Paleta de marca BA (idéntica al frontend)
    const primaryColor = '#3A7344';   // pine
    const textColor = '#332F28';      // charcoal
    const backgroundColor = '#FFFFFF';
    const sandColor = '#EAD1BA';      // sand
    const clayColor = '#997A63';      // clay
    const fogColor = '#BFBFBF';       // fog
    const slateColor = '#535353';     // slate
    const rowAltColor = '#F5F0EA';    // fog/10 warm

    const customerName = this.toTitleCase(
      customer ? `${customer.name || ''} ${customer.lastName || ''}`.trim() || 'N/A' : 'N/A',
    );
    const customerEmail = customer?.email ?? 'N/A';
    const customerPhone = (customer as { phone?: string })?.phone ?? 'N/A';
    const experience = this.toTitleCase(quote.experience || 'N/A');
    const creationDate = (quote as any)?.createdAt
      ? new Date((quote as any).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // ── RECOLECTAR DATOS DE MEDIA ──
    const kitchenInfo = (quote.kitchenInformation as Record<string, unknown>) || {};

    // Countertops files
    const countertopsFiles: string[] = (
      (quote.countertopsFiles?.length ? quote.countertopsFiles : null) ??
      (Array.isArray(kitchenInfo['countertopsFiles']) ? kitchenInfo['countertopsFiles'] as string[] : null) ??
      []
    );

    // Backsplash files
    const backsplashFiles: string[] = (
      (quote.backsplashFiles?.length ? quote.backsplashFiles : null) ??
      (Array.isArray(kitchenInfo['backsplashFiles']) ? kitchenInfo['backsplashFiles'] as string[] : null) ??
      []
    );

    // Audio notes
    const audioNotesRaw = kitchenInfo['audioNotes'] ?? (quote as any).audioNotes;
    let audioNotes: Array<{ url: string; transcription?: string; summary?: string }> = [];
    if (Array.isArray(audioNotesRaw)) {
      audioNotes = audioNotesRaw as typeof audioNotes;
    } else if (audioNotesRaw && typeof audioNotesRaw === 'object' && 'url' in (audioNotesRaw as object)) {
      audioNotes = [audioNotesRaw as typeof audioNotes[0]];
    }

    // Sketch files
    let sketchFiles: string[] = [];
    const sketchFilesRaw = (quote as any).sketchFiles ?? kitchenInfo['sketchFiles'];
    if (Array.isArray(sketchFilesRaw) && sketchFilesRaw.length > 0) {
      sketchFiles = sketchFilesRaw as string[];
    } else if (kitchenInfo['sketchFile'] && typeof kitchenInfo['sketchFile'] === 'string') {
      sketchFiles = [kitchenInfo['sketchFile'] as string];
    }

    // Additional comments
    const additionalCommentsRaw = kitchenInfo['additionalComments'] ?? (quote as any).additionalComments;
    const additionalCommentText: string = (additionalCommentsRaw as any)?.comment ?? '';
    const additionalMediaFiles: string[] = Array.isArray((additionalCommentsRaw as any)?.mediaFiles)
      ? (additionalCommentsRaw as any).mediaFiles as string[]
      : [];

    // ── PRE-DESCARGAR IMÁGENES ──
    // Campos a excluir del grid de tarjetas (se renderizan en secciones dedicadas)
    const MEDIA_KEYS_TO_EXCLUDE = new Set([
      'countertopsFiles', 'backsplashFiles', 'audioNotes',
      'sketchFiles', 'sketchFile', 'additionalComments',
    ]);

    // Recolectar todas las URLs de imagen para descargar
    interface FileWithData {
      label: string;
      section: 'countertops' | 'backsplash' | 'materials' | 'sketch' | 'audio' | 'additional';
      url: string;
      presignedUrl: string;
      imageBuffer?: Buffer;
      dataUri?: string;
    }
    const allFilesWithData: FileWithData[] = [];

    const urlsToProcess: { label: string; url: string; section: FileWithData['section'] }[] = [];
    countertopsFiles.forEach((url, i) => {
      if (url) urlsToProcess.push({ label: `Countertop ${i + 1}`, url, section: 'countertops' });
    });
    backsplashFiles.forEach((url, i) => {
      if (url) urlsToProcess.push({ label: `Backsplash ${i + 1}`, url, section: 'backsplash' });
    });
    if (quote.materials?.file) {
      urlsToProcess.push({ label: 'Materials File', url: quote.materials.file, section: 'materials' });
    }
    sketchFiles.forEach((url, i) => {
      if (url) urlsToProcess.push({ label: sketchFiles.length > 1 ? `Sketch ${i + 1} of ${sketchFiles.length}` : 'Sketch', url, section: 'sketch' });
    });
    additionalMediaFiles.forEach((url, i) => {
      if (url) urlsToProcess.push({ label: `Media ${i + 1}`, url, section: 'additional' });
    });

    for (const { label, url, section } of urlsToProcess) {
      try {
        const presignedUrl = await this.uploadService.getPresignedDownloadUrl(url);
        const item: FileWithData = { label, url, presignedUrl, section };
        if (this.isImageUrl(url)) {
          try {
            const { buffer } = await this.uploadService.getFileBuffer(url);
            const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
            if (!['jpg', 'jpeg', 'png'].includes(ext)) {
              // convert non-JPEG/PNG to JPEG for base64 embedding
              item.imageBuffer = await (sharp as any)(buffer).jpeg({ quality: 90 }).toBuffer();
            } else {
              item.imageBuffer = buffer;
            }
          } catch (err) {
            this.logger.warn(`Error descargando imagen para PDF (${url}): ${err}`);
          }
        }
        allFilesWithData.push(item);
      } catch (err) {
        this.logger.warn(`No se pudo obtener URL presignada para ${url}: ${err}`);
        allFilesWithData.push({ label, url, presignedUrl: url, section });
      }
    }

    // Compute base64 data URIs for inline image embedding
    for (const file of allFilesWithData) {
      if (file.imageBuffer) {
        const ext = file.url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        file.dataUri = `data:${mimeType};base64,${file.imageBuffer.toString('base64')}`;
      }
    }

    const notesText = quote.notes || '';
    const kitchenSizeText = (kitchenInfo['type'] as string) || '';
    const sqFtText = kitchenInfo['kitchenSquareFootage'] ? `${kitchenInfo['kitchenSquareFootage']} SF` : '';
    const ceilingText = kitchenInfo['ceilingHeight'] ? `${kitchenInfo['ceilingHeight']} ft` : '';
    const clientBudgetText = (quote as any).clientBudget
      ? `$${Number((quote as any).clientBudget).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : '';
    const roughQuoteText = (quote as any).roughQuote
      ? `$${Number((quote as any).roughQuote).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      : '';

    const html = this.buildPdfHtml({
      quote,
      customerName,
      customerEmail,
      customerPhone,
      experience,
      creationDate,
      kitchenInfo,
      allFilesWithData,
      audioNotes,
      additionalCommentText,
      clientBudgetText,
      roughQuoteText,
      notesText,
      kitchenSizeText,
      sqFtText,
      ceilingText,
      MEDIA_KEYS_TO_EXCLUDE,
    });

    const browser = await (puppeteer as any).launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }

    return Buffer.alloc(0);
  }

  private buildPdfHtml(data: {
    quote: Quote;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    experience: string;
    creationDate: string;
    kitchenInfo: Record<string, unknown>;
    allFilesWithData: Array<{
      label: string;
      section: string;
      url: string;
      presignedUrl: string;
      imageBuffer?: Buffer;
      dataUri?: string;
    }>;
    audioNotes: Array<{ url: string; transcription?: string; summary?: string }>;
    additionalCommentText: string;
    clientBudgetText: string;
    roughQuoteText: string;
    notesText: string;
    kitchenSizeText: string;
    sqFtText: string;
    ceilingText: string;
    MEDIA_KEYS_TO_EXCLUDE: Set<string>;
  }): string {
    const {
      quote, customerName, customerEmail, customerPhone, experience, creationDate,
      kitchenInfo, allFilesWithData, audioNotes, additionalCommentText,
      clientBudgetText, roughQuoteText, notesText, kitchenSizeText, sqFtText,
      ceilingText, MEDIA_KEYS_TO_EXCLUDE,
    } = data;

    const e = (s: unknown): string =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const bySection = (sec: string) => allFilesWithData.filter(f => f.section === sec);

    const totalStr = `$${quote.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const categoryLabel =
      quote.category === QuoteCategory.KITCHEN ? 'Kitchen'
      : quote.category === QuoteCategory.BATHROOM ? 'Bathroom'
      : quote.category === QuoteCategory.BASEMENT ? 'Basement'
      : quote.category === QuoteCategory.ADDITIONAL_WORK ? 'Additional Work'
      : this.toTitleCase(quote.category);

    let heroStrip = '';
    if (quote.status === QuoteStatus.APPROVED) {
      const d = (quote as any).updatedAt
        ? new Date((quote as any).updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';
      heroStrip = `<div class="hero-strip-approved">Approved${d ? ' on ' + e(d) : ''}</div>`;
    } else if (quote.status === QuoteStatus.REJECTED) {
      heroStrip = `<div class="hero-strip-rejected">Rejected</div>`;
    }

    const renderFile = (file: { label: string; url: string; presignedUrl: string; dataUri?: string }, caption?: string): string => {
      if (file.dataUri) {
        return `<div class="img-wrap"><img src="${file.dataUri}" alt="${e(caption ?? file.label)}">${caption ? `<p class="img-caption">${e(caption)}</p>` : ''}</div>`;
      }
      const ext = file.url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
      const type = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ? 'VIDEO'
        : this.isImageUrl(file.url) ? 'IMAGE' : 'FILE';
      return `<a href="${e(file.presignedUrl)}" class="file-link"><span class="file-type">${type}</span><span class="file-name">${e(caption ?? this.friendlyFileName(file.url))}</span></a>`;
    };

    const renderFileGrid = (files: typeof allFilesWithData, cols = 3): string => {
      if (!files.length) return '';
      const imgs = files.filter(f => f.dataUri);
      const links = files.filter(f => !f.dataUri);
      let html = '';
      if (imgs.length) {
        const cls = cols === 2 ? 'img-grid-2' : 'img-grid';
        html += `<div class="${cls}">${imgs.map(f => renderFile(f, imgs.length > 1 ? f.label : undefined)).join('')}</div>`;
        if (links.length) html += '<div class="spacer"></div>';
      }
      html += links.map(f => renderFile(f)).join('');
      return html;
    };

    const field = (label: string, value: string): string => {
      if (!value) return '';
      return `<div><span class="field-label">${e(label)}</span><p class="field-value">${e(value)}</p></div>`;
    };

    const section = (title: string, content: string): string =>
      `<div class="section"><h4 class="section-title">${e(title)}</h4>${content}</div>`;

    const customerSection = section('Customer',
      `<div class="grid-3">${field('Name', customerName)}${field('Email', customerEmail)}${field('Phone', customerPhone)}</div>`);

    const projectFields = [
      field('Experience', experience),
      (quote as any).projectName ? field('Project', (quote as any).projectName) : '',
      kitchenSizeText ? field('Kitchen Size', kitchenSizeText) : '',
      sqFtText ? field('Square Footage', sqFtText) : '',
      ceilingText ? field('Ceiling Height', ceilingText) : '',
      (quote as any).address ? field('Address', (quote as any).address) : '',
      (quote as any).source ? field('Source', this.toTitleCase(String((quote as any).source))) : '',
      clientBudgetText ? field('Client Budget', clientBudgetText) : '',
      roughQuoteText ? field('Rough Quote', roughQuoteText) : '',
    ].join('');
    const projectSection = section('Project Details', `<div class="grid-3">${projectFields}</div>`);

    const notesSection = notesText
      ? section('Notes', `<p style="font-size:13px;color:#332F28;font-style:italic;">${e(notesText)}</p>`)
      : '';

    const kitchenCategoryTitle =
      quote.category === QuoteCategory.KITCHEN ? 'Kitchen Information'
      : quote.category === QuoteCategory.BATHROOM ? 'Bathroom Information'
      : quote.category === QuoteCategory.BASEMENT ? 'Basement Information'
      : quote.category === QuoteCategory.ADDITIONAL_WORK ? 'Additional Work Information'
      : 'Estimate Information';

    const kitchenCells = Object.entries(kitchenInfo)
      .filter(([key, value]) => {
        if (MEDIA_KEYS_TO_EXCLUDE.has(key)) return false;
        if (value === undefined || value === null || value === '' || value === false || value === 'No') return false;
        if (typeof value === 'string') {
          const lc = value.toLowerCase().trim();
          if (lc === 'none' || lc === 'n/a' || lc === 'no') return false;
        }
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return false;
        return true;
      })
      .map(([key, value]) => {
        const displayVal = value === true ? 'Yes' : this.formatValueForDisplay(value);
        if (!displayVal) return '';
        const lc = String(displayVal).toLowerCase().trim();
        if (lc === 'none' || lc.startsWith('none ') || lc === 'n/a') return '';
        return `<div><span class="field-label">${e(this.formatKeyForDisplay(key))}</span><p class="field-value">${e(displayVal)}</p></div>`;
      })
      .filter(Boolean)
      .join('');
    const kitchenSection = kitchenCells ? section(kitchenCategoryTitle, `<div class="grid-3">${kitchenCells}</div>`) : '';

    const matFiles = bySection('materials');
    const hasMat = matFiles.length > 0 || (quote.materials?.items?.length ?? 0) > 0;
    let matContent = '';
    if (hasMat) {
      if (matFiles.length > 0) {
        matContent += `<p class="subsection-label">Materials File</p>${renderFile(matFiles[0])}`;
      }
      if (quote.materials?.items?.length) {
        matContent += `<table class="mat-table"${matFiles.length ? ' style="margin-top:16px;"' : ''}><thead><tr><th>Qty</th><th>Description</th></tr></thead><tbody>${
          quote.materials.items.map(it => `<tr><td style="font-weight:700;width:70px;">${e(String(it.quantity))}</td><td>${e(it.description)}</td></tr>`).join('')
        }</tbody></table>`;
      }
    }
    const materialsSection = matContent ? section('Materials', matContent) : '';

    const countertopsData = bySection('countertops');
    const backsplashData = bySection('backsplash');
    const sketchData = bySection('sketch');
    let mediaContent = '';
    if (countertopsData.length) {
      mediaContent += `<p class="subsection-label">Countertops</p>${renderFileGrid(countertopsData, 3)}`;
      if (backsplashData.length || sketchData.length) mediaContent += '<div class="spacer"></div>';
    }
    if (backsplashData.length) {
      mediaContent += `<p class="subsection-label">Backsplash</p>${renderFileGrid(backsplashData, 3)}`;
      if (sketchData.length) mediaContent += '<div class="spacer"></div>';
    }
    if (sketchData.length) {
      mediaContent += `<p class="subsection-label">Sketches</p>${renderFileGrid(sketchData, 2)}`;
    }
    const mediaSection = mediaContent ? section('Media', mediaContent) : '';

    const audioCards = audioNotes.map((note, i) => {
      if (!note?.url) return '';
      const title = audioNotes.length > 1 ? `Audio Note ${i + 1} of ${audioNotes.length}` : 'Audio Note';
      let c = `${i > 0 ? '<div class="spacer"></div>' : ''}<p class="subsection-label">${e(title)}</p>`;
      c += `<a href="${e(note.url)}" class="file-link"><span class="file-type">AUDIO</span><span class="file-name">Listen to Audio</span></a>`;
      if (note.summary) c += `<div class="audio-card"><p class="audio-label">Summary</p><p class="audio-text">${e(note.summary)}</p></div>`;
      if (note.transcription) c += `<p class="transcription-label">Transcription</p><p class="transcription-text">${e(note.transcription)}</p>`;
      return c;
    }).filter(Boolean).join('');
    const audioSection = audioCards ? section('Audio Notes', audioCards) : '';

    const additionalData = bySection('additional');
    let addContent = '';
    if (additionalCommentText) {
      addContent += `<p style="font-size:13px;color:#332F28;white-space:pre-line;margin-bottom:${additionalData.length ? '12px' : '0'};">${e(additionalCommentText)}</p>`;
    }
    if (additionalData.length) addContent += renderFileGrid(additionalData, 3);
    const additionalSection = addContent ? section('Additional Comments & Media', addContent) : '';

    let rejectionCard = '';
    if (quote.status === QuoteStatus.REJECTED) {
      const rc = (quote as any).rejectionComments;
      if (rc?.comment) {
        const rejDate = rc.rejectedAt
          ? new Date(rc.rejectedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : '';
        let rcContent = `<p style="font-size:13px;color:#332F28;margin-bottom:8px;">${e(rc.comment)}</p>`;
        if (rejDate) rcContent += `<p style="font-size:11px;color:#535353;margin-bottom:12px;">Rejected on ${e(rejDate)}</p>`;
        if (Array.isArray(rc.mediaFiles) && rc.mediaFiles.length > 0) {
          const imgUrls = (rc.mediaFiles as string[]).filter((u: string) => this.isImageUrl(u));
          const otherUrls = (rc.mediaFiles as string[]).filter((u: string) => !this.isImageUrl(u));
          if (imgUrls.length) {
            rcContent += `<div class="img-grid">${imgUrls.map((u: string) => `<div class="img-wrap"><img src="${e(u)}" alt="Rejection media"></div>`).join('')}</div>`;
          }
          rcContent += otherUrls.map((u: string) => {
            const ext2 = u.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
            const type = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext2) ? 'VIDEO' : 'FILE';
            return `<a href="${e(u)}" class="file-link"><span class="file-type">${type}</span><span class="file-name">${e(this.friendlyFileName(u))}</span></a>`;
          }).join('');
        }
        rejectionCard = `<div class="rejection-card"><h4 class="rejection-title">Rejection Details</h4>${rcContent}</div>`;
      }
    }

    const allSections = [
      customerSection, projectSection, notesSection, kitchenSection,
      materialsSection, mediaSection, audioSection, additionalSection,
    ].filter(Boolean).join('');

    const generatedOn = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #F9F7F4; color: #332F28; font-size: 14px; line-height: 1.5; }
    @page { size: A4; margin: 32px 40px 40px 40px; }
    .hero { background: #3A7344; border-radius: 40px; padding: 32px 36px; margin-bottom: 20px; }
    .hero-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .badge { display: inline-flex; align-items: center; padding: 4px 14px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-category { background: rgba(255,255,255,0.2); color: white; }
    .badge-status { background: rgba(255,255,255,0.15); color: white; }
    .badge-co { background: rgba(251,191,36,0.8); color: #332F28; }
    .hero-main { display: flex; justify-content: space-between; align-items: flex-start; }
    .hero-title { color: white; font-size: 26px; font-weight: 700; }
    .hero-version { color: rgba(255,255,255,0.6); font-weight: 400; }
    .hero-date { color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 8px; }
    .hero-cost { text-align: right; }
    .hero-cost-label { color: rgba(255,255,255,0.6); font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .hero-cost-value { color: white; font-size: 26px; font-weight: 700; }
    .hero-strip-approved { border-top: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.1); margin: 20px -36px -32px; padding: 10px 36px; border-radius: 0 0 40px 40px; color: rgba(255,255,255,0.9); font-size: 12px; }
    .hero-strip-rejected { border-top: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.15); margin: 20px -36px -32px; padding: 10px 36px; border-radius: 0 0 40px 40px; color: rgba(255,255,255,0.9); font-size: 12px; }
    .card { border: 1px solid rgba(191,191,191,0.6); border-radius: 32px; background: white; overflow: hidden; margin-bottom: 20px; }
    .section { padding: 24px; border-bottom: 1px solid rgba(191,191,191,0.4); }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #997A63; margin-bottom: 16px; }
    .subsection-label { font-size: 12px; font-weight: 600; color: #332F28; margin-bottom: 8px; }
    .spacer { height: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .field-label { font-size: 11px; color: #535353; display: block; margin-bottom: 3px; }
    .field-value { font-size: 13px; font-weight: 600; color: #332F28; }
    .img-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .img-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .img-wrap { border-radius: 10px; overflow: hidden; background: #f0ece8; }
    .img-wrap img { width: 100%; height: 150px; object-fit: cover; display: block; }
    .img-caption { font-size: 10px; color: #535353; padding: 4px 8px; text-align: center; }
    .file-link { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(191,191,191,0.6); background: #F9F7F4; margin-bottom: 6px; text-decoration: none; }
    .file-type { font-size: 10px; font-weight: 700; color: #997A63; text-transform: uppercase; padding-right: 8px; border-right: 1px solid rgba(191,191,191,0.5); min-width: 36px; flex-shrink: 0; }
    .file-name { font-size: 12px; color: #3A7344; text-decoration: underline; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mat-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .mat-table th { background: #F5F0EA; padding: 7px 12px; text-align: left; font-size: 10px; color: #997A63; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
    .mat-table td { padding: 7px 12px; border-bottom: 1px solid rgba(191,191,191,0.3); }
    .audio-card { border-radius: 10px; background: rgba(58,115,68,0.05); border: 1px solid rgba(58,115,68,0.2); padding: 12px; margin-top: 8px; }
    .audio-label { font-size: 10px; font-weight: 700; color: #3A7344; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .audio-text { font-size: 12px; color: #332F28; white-space: pre-line; }
    .transcription-label { font-size: 10px; font-weight: 700; color: #535353; text-transform: uppercase; letter-spacing: 0.08em; margin: 10px 0 4px; }
    .transcription-text { font-size: 11px; color: #535353; font-style: italic; white-space: pre-line; }
    .rejection-card { border: 1px solid rgba(220,38,38,0.3); border-radius: 16px; background: rgba(220,38,38,0.04); padding: 20px; margin-bottom: 20px; }
    .rejection-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #dc2626; margin-bottom: 12px; }
    .footer { text-align: center; font-size: 10px; color: #BFBFBF; padding-top: 14px; border-top: 1px solid rgba(191,191,191,0.4); margin-top: 4px; }
    a { color: #3A7344; }
  </style>
</head>
<body>
  <div class="hero">
    <div class="hero-badges">
      <span class="badge badge-category">${e(categoryLabel)}</span>
      <span class="badge badge-status">${e(this.toTitleCase(quote.status))}</span>
      ${(quote as any).isChangeOrder ? '<span class="badge badge-co">Change Order</span>' : ''}
    </div>
    <div class="hero-main">
      <div>
        <h1 class="hero-title">Estimate <span class="hero-version">v${e(String(quote.versionNumber))}</span></h1>
        <p class="hero-date">${e(creationDate)}</p>
      </div>
      <div class="hero-cost">
        <p class="hero-cost-label">Total Cost</p>
        <p class="hero-cost-value">${e(totalStr)}</p>
      </div>
    </div>
    ${heroStrip}
  </div>
  <div class="card">${allSections}</div>
  ${rejectionCard}
  <div class="footer">BA Kitchen &amp; Bath Design &mdash; Generated on ${e(generatedOn)}</div>
</body>
</html>`;
  }

  async findAll(
    companyId?: string,
    projectId?: string,
    category?: QuoteCategory,
    status?: QuoteStatus,
    userId?: string,
    customerId?: string,
  ): Promise<Quote[]> {
    const filter: Record<string, unknown> = {};

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
    }

    if (customerId) {
      if (!Types.ObjectId.isValid(customerId)) {
        throw new BadRequestException('Invalid customerId format');
      }
      filter.customerId = new Types.ObjectId(customerId);
    }

    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException('Invalid projectId format');
      }
      filter.projectId = new Types.ObjectId(projectId);
    }

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      filter.userId = new Types.ObjectId(userId);
    }

    return this.quoteModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  async findById(id: string): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const quote = await this.quoteModel
      .findById(id)
      .populate('customerId', 'name lastName email phone address city zipCode state leadSource description')
      .populate('companyId', 'name description active configuration')
      .lean()
      .exec();

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote as Quote;
  }

  async getOrCreatePdfUrl(id: string): Promise<string> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const quoteDoc = await this.quoteModel.findById(id).exec();
    if (!quoteDoc) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    const [project, customer, company] = await Promise.all([
      this.projectModel.findById(quoteDoc.projectId).lean().exec(),
      this.customerModel.findById(quoteDoc.customerId).lean().exec(),
      this.companyModel.findById(quoteDoc.companyId).lean().exec(),
    ]);

    if (!project || !customer || !company) {
      throw new NotFoundException('Could not resolve project/customer/company to generate PDF');
    }

    const pdfUrl = await this.ensurePdfUrl(
      quoteDoc,
      project as unknown as Project,
      customer as unknown as Customer,
      company as unknown as Company,
    );

    if (!pdfUrl) {
      throw new BadRequestException('Could not generate PDF for this quote');
    }

    // Add cache-buster so browsers always fetch the freshly generated file
    return `${pdfUrl}?v=${Date.now()}`;
  }

  async findByProjectId(projectId: string): Promise<Quote[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    return this.quoteModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ versionNumber: 1, createdAt: -1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  async findVersions(projectId: string, versionNumber?: number): Promise<Quote[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const filter: Record<string, unknown> = {
      projectId: new Types.ObjectId(projectId),
    };

    if (versionNumber !== undefined) {
      filter.versionNumber = versionNumber;
    }

    return this.quoteModel
      .find(filter)
      .sort({ versionNumber: 1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  private validateStatusTransition(fromStatus: QuoteStatus, toStatus: QuoteStatus): void {
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.PENDING, QuoteStatus.SENT],
      [QuoteStatus.PENDING]: [QuoteStatus.APPROVED, QuoteStatus.REJECTED],
      [QuoteStatus.APPROVED]: [QuoteStatus.SENT, QuoteStatus.IN_PROGRESS],
      [QuoteStatus.SENT]: [QuoteStatus.APPROVED, QuoteStatus.REJECTED, QuoteStatus.IN_PROGRESS],
      [QuoteStatus.REJECTED]: [QuoteStatus.DRAFT, QuoteStatus.PENDING],
      [QuoteStatus.IN_PROGRESS]: [QuoteStatus.COMPLETED],
      [QuoteStatus.COMPLETED]: [],
    };

    const allowedTransitions = validTransitions[fromStatus] || [];
    if (!allowedTransitions.includes(toStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  async update(id: string, updateDto: UpdateQuoteDto): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingQuote = await this.quoteModel.findById(id).exec();
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    // Validar transición de estado si se está cambiando
    if (updateDto.status !== undefined && updateDto.status !== existingQuote.status) {
      this.validateStatusTransition(existingQuote.status, updateDto.status);

      // Si se rechaza, validar que rejectionComments.comment esté presente
      if (updateDto.status === QuoteStatus.REJECTED) {
        if (!updateDto.rejectionComments?.comment) {
          throw new BadRequestException(
            'rejectionComments.comment is required when status is rejected',
          );
        }
      }
    }

    // Si el estado es rejected y no hay rejectionComments en el DTO, validar que exista
    if (updateDto.status === QuoteStatus.REJECTED && !updateDto.rejectionComments) {
      throw new BadRequestException(
        'rejectionComments is required when status is rejected',
      );
    }

    // Actualizar campos básicos
    if (updateDto.customerId) {
      existingQuote.customerId = new Types.ObjectId(updateDto.customerId) as any;
    }
    if (updateDto.companyId) {
      existingQuote.companyId = new Types.ObjectId(updateDto.companyId) as any;
    }
    if (updateDto.projectId) {
      existingQuote.projectId = new Types.ObjectId(updateDto.projectId) as any;
    }
    if (updateDto.experience !== undefined) {
      existingQuote.experience = updateDto.experience;
    }
    if (updateDto.category !== undefined) {
      existingQuote.category = updateDto.category;
    }
    if (updateDto.userId) {
      existingQuote.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.versionNumber !== undefined) {
      existingQuote.versionNumber = updateDto.versionNumber;
    }
    if (updateDto.status !== undefined && updateDto.status !== existingQuote.status) {
      const fromStatus = existingQuote.status;
      existingQuote.status = updateDto.status;

      // Si se rechaza, guardar rejectionComments
      if (updateDto.status === QuoteStatus.REJECTED && updateDto.rejectionComments) {
        existingQuote.rejectionComments = {
          comment: updateDto.rejectionComments.comment,
          rejectedBy: updateDto.rejectionComments.rejectedBy
            ? new Types.ObjectId(updateDto.rejectionComments.rejectedBy)
            : undefined,
          rejectedAt: new Date(),
          mediaFiles: updateDto.rejectionComments.mediaFiles || [],
        } as any;
      } else if (updateDto.status !== QuoteStatus.REJECTED) {
        // Limpiar rejectionComments si no está rechazado
        existingQuote.rejectionComments = null;
      }

      // Record transition
      await this.statusHistoryService.recordTransition({
        entityId: id,
        entityType: 'quote',
        fromStatus,
        toStatus: updateDto.status,
        userId: updateDto.userId || existingQuote.userId?.toString(),
        companyId: existingQuote.companyId.toString(),
      });
    }

    // Actualizar rejectionComments si se proporciona independientemente del status
    if (updateDto.rejectionComments !== undefined) {
      if (updateDto.rejectionComments === null) {
        existingQuote.rejectionComments = null;
      } else if (updateDto.rejectionComments.comment) {
        existingQuote.rejectionComments = {
          comment: updateDto.rejectionComments.comment,
          rejectedBy: updateDto.rejectionComments.rejectedBy
            ? new Types.ObjectId(updateDto.rejectionComments.rejectedBy)
            : undefined,
          rejectedAt: existingQuote.rejectionComments?.rejectedAt || new Date(),
          mediaFiles: updateDto.rejectionComments.mediaFiles || [],
        } as any;
      }
    }
    if (updateDto.totalPrice !== undefined) {
      existingQuote.totalPrice = updateDto.totalPrice;
    }
    if (updateDto.notes !== undefined) {
      existingQuote.notes = updateDto.notes;
    }
    if (updateDto.kitchenInformation !== undefined) {
      existingQuote.kitchenInformation = updateDto.kitchenInformation as any;
    }
    if (updateDto.bathroomInformation !== undefined) {
      existingQuote.bathroomInformation = updateDto.bathroomInformation as any;
    }
    if (updateDto.basementInformation !== undefined) {
      existingQuote.basementInformation = updateDto.basementInformation as any;
    }
    if (updateDto.additionalWorkInformation !== undefined) {
      existingQuote.additionalWorkInformation = updateDto.additionalWorkInformation as any;
    }
    if (updateDto.countertopsFiles !== undefined) {
      existingQuote.countertopsFiles = updateDto.countertopsFiles;
    }
    if (updateDto.backsplashFiles !== undefined) {
      existingQuote.backsplashFiles = updateDto.backsplashFiles;
    }
    if (updateDto.materials !== undefined) {
      existingQuote.materials = updateDto.materials as any;
    }

    await existingQuote.save();
    return existingQuote.toObject();
  }

  async approve(id: string, approveDto: ApproveQuoteDto): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingQuote = await this.quoteModel.findById(id).exec();
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    if (existingQuote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException(
        `Quote must be in ${QuoteStatus.PENDING} status to be approved. Current status: ${existingQuote.status}`,
      );
    }

    const fromStatus = existingQuote.status;
    existingQuote.status = QuoteStatus.APPROVED;

    await this.statusHistoryService.recordTransition({
      entityId: id,
      entityType: 'quote',
      fromStatus,
      toStatus: QuoteStatus.APPROVED,
      userId: approveDto.approvedBy || existingQuote.userId?.toString(),
      companyId: existingQuote.companyId.toString(),
    });

    await existingQuote.save();
    return existingQuote.toObject();
  }

  async reject(id: string, rejectDto: RejectQuoteDto): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingQuote = await this.quoteModel.findById(id).exec();
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    if (existingQuote.status !== QuoteStatus.PENDING) {
      throw new BadRequestException(
        `Quote must be in ${QuoteStatus.PENDING} status to be rejected. Current status: ${existingQuote.status}`,
      );
    }

    const fromStatus = existingQuote.status;
    existingQuote.status = QuoteStatus.REJECTED;
    existingQuote.rejectionComments = {
      comment: rejectDto.comment,
      rejectedBy: rejectDto.rejectedBy ? new Types.ObjectId(rejectDto.rejectedBy) : undefined,
      rejectedAt: new Date(),
      mediaFiles: rejectDto.mediaFiles || [],
    } as any;

    await this.statusHistoryService.recordTransition({
      entityId: id,
      entityType: 'quote',
      fromStatus,
      toStatus: QuoteStatus.REJECTED,
      userId: rejectDto.rejectedBy || existingQuote.userId?.toString(),
      companyId: existingQuote.companyId.toString(),
    });

    await existingQuote.save();
    return existingQuote.toObject();
  }

  async send(id: string, sendDto: SendQuoteDto): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingQuote = await this.quoteModel.findById(id).exec();
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    if (existingQuote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException(
        `Quote must be in ${QuoteStatus.APPROVED} status to be sent. Current status: ${existingQuote.status}`,
      );
    }

    const fromStatus = existingQuote.status;
    existingQuote.status = QuoteStatus.SENT;

    await this.statusHistoryService.recordTransition({
      entityId: id,
      entityType: 'quote',
      fromStatus,
      toStatus: QuoteStatus.SENT,
      userId: sendDto.sentBy || existingQuote.userId?.toString(),
      companyId: existingQuote.companyId.toString(),
    });

    await existingQuote.save();

    const [project, customer, company] = await Promise.all([
      this.projectModel.findById(existingQuote.projectId).lean().exec(),
      this.customerModel.findById(existingQuote.customerId).lean().exec(),
      this.companyModel.findById(existingQuote.companyId).lean().exec(),
    ]);

    // Generar PDF y subir a S3 si aún no tiene uno
    if (project && customer && company) {
      await this.ensurePdfUrl(
        existingQuote, 
        project as unknown as Project, 
        customer as unknown as Customer, 
        company as unknown as Company
      );
    }

    const customerUserId = (customer as { userId?: { toString(): string } } | null)?.userId?.toString();
    if (customerUserId) {
      this.notificationService
        .create({
          userId: customerUserId,
          type: NotificationType.QUOTE_SENT,
          payload: {
            projectName: project && typeof project === 'object' && 'name' in project ? (project as { name: string }).name : 'Project',
            quoteId: id,
            quoteVersion: existingQuote.versionNumber,
          },
          channels: ['in_app', 'email', 'sms'],
        })
        .catch((err) => this.logger.warn(`Notification failed: ${err instanceof Error ? err.message : String(err)}`));
    }

    return existingQuote.toObject();
  }

  async delete(id: string): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const deleted = await this.quoteModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return deleted as Quote;
  }
}