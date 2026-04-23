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
import * as PDFDocument from 'pdfkit';
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
              // PDFKit only supports JPEG/PNG natively — convert via sharp
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

    const filesBySection = (section: FileWithData['section']) => allFilesWithData.filter(f => f.section === section);

    return new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new (PDFDocument as any)({ margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const drawPageBackground = () => {
        const { width, height } = doc.page;
        doc.save();
        doc.fillColor(backgroundColor).rect(0, 0, width, height).fill();
        doc.fillColor(textColor);
        doc.restore();
      };

      const drawFooter = (pageNumber: number, pageCount: number) => {
        const { width, height, margins } = doc.page;
        doc.save();
        doc.strokeColor(fogColor).lineWidth(0.5)
          .moveTo(margins.left, height - margins.bottom + 6)
          .lineTo(width - margins.right, height - margins.bottom + 6)
          .stroke();
        doc.fontSize(8).fillColor(slateColor);
        doc.text(
          `Page ${pageNumber} of ${pageCount} — Generated on ${new Date().toLocaleDateString('en-US')}`,
          margins.left,
          height - margins.bottom + 10,
          { width: width - margins.left - margins.right, align: 'center' },
        );
        doc.restore();
      };

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      const checkPageBreak = (neededHeight: number) => {
        if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
          drawPageBackground();
          doc.y = doc.page.margins.top;
        }
      };

      // Título de sección — charcoal bold + subrayado pine (replica pantalla)
      const drawSectionBar = (label: string) => {
        checkPageBreak(28);
        const top = doc.y;
        doc.save();
        doc.font('Helvetica-Bold').fontSize(13).fillColor(textColor);
        doc.text(label, doc.page.margins.left, top, { width: pageWidth });
        const labelW = doc.widthOfString(label);
        doc.strokeColor(primaryColor).lineWidth(0.8)
          .moveTo(doc.page.margins.left, top + 15)
          .lineTo(doc.page.margins.left + Math.min(labelW, pageWidth), top + 15)
          .stroke();
        doc.restore();
        doc.fillColor(textColor);
        doc.moveDown(1.5);
      };

      // Grid de cards (3 columnas) — replica pantalla de quote-detail
      const drawKeyValueTable = (
        rows: Array<{ item: string; value: string | number | boolean; linkUrl?: string }>,
      ) => {
        if (!rows.length) return;

        const cardCols = 3;
        const cardGap = 8;
        const cardW = (pageWidth - cardGap * (cardCols - 1)) / cardCols;
        const labelFontSize = 7;
        const valueFontSize = 10;
        const padX = 6;
        const padY = 5;

        for (let rowStart = 0; rowStart < rows.length; rowStart += cardCols) {
          const batch = rows.slice(rowStart, rowStart + cardCols);

          const batchHeights = batch.map((row) => {
            doc.font('Helvetica-Bold').fontSize(labelFontSize);
            const lblH = doc.heightOfString(String(row.item).toUpperCase(), { width: cardW - padX * 2 });
            doc.font('Helvetica').fontSize(valueFontSize);
            const valH = doc.heightOfString(String(row.value), { width: cardW - padX * 2 });
            return Math.max(36, padY + lblH + 4 + valH + padY);
          });

          const rowH = Math.max(...batchHeights);
          checkPageBreak(rowH + 8);

          const rowY = doc.y;

          batch.forEach((row, j) => {
            const cx = doc.page.margins.left + j * (cardW + cardGap);
            const cy = rowY;

            doc.save();
            doc.fillColor(rowAltColor).roundedRect(cx, cy, cardW, rowH, 4).fill();
            doc.strokeColor(fogColor).lineWidth(0.3).roundedRect(cx, cy, cardW, rowH, 4).stroke();
            doc.font('Helvetica-Bold').fontSize(labelFontSize).fillColor(clayColor);
            doc.text(String(row.item).toUpperCase(), cx + padX, cy + padY, { width: cardW - padX * 2 });
            const lblH = doc.heightOfString(String(row.item).toUpperCase(), { width: cardW - padX * 2 });
            const valueColor = row.linkUrl ? primaryColor : textColor;
            doc.font(row.linkUrl ? 'Helvetica-Bold' : 'Helvetica').fontSize(valueFontSize).fillColor(valueColor);
            if (row.linkUrl) {
              doc.text(String(row.value), cx + padX, cy + padY + lblH + 4, {
                width: cardW - padX * 2,
                link: row.linkUrl,
                underline: true,
              });
            } else {
              doc.text(String(row.value), cx + padX, cy + padY + lblH + 4, { width: cardW - padX * 2 });
            }
            doc.restore();
          });

          doc.y = rowY + rowH + 6;
        }
        doc.y += 8;
        doc.fillColor(textColor);
      };

      const buildKeyValueRows = (data?: Record<string, unknown>, excludeKeys?: Set<string>) => {
        if (!data) return [] as Array<{ item: string; value: string | number | boolean; linkUrl?: string }>;
        const entries = Object.entries(data).filter(([key, value]) => {
          if (excludeKeys?.has(key)) return false;
          if (value === undefined || value === null || value === '' || value === false) return false;
          // Filtrar valores "none" o "No" que significan campo no aplica
          if (typeof value === 'string') {
            const lc = value.toLowerCase().trim();
            if (lc === 'none' || lc === 'no' || lc === 'n/a') return false;
          }
          return true;
        });
        const rows: Array<{ item: string; value: string | number | boolean; linkUrl?: string }> = [];

        entries.forEach(([key, value]) => {
          if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
            (value as string[]).forEach((url, index) => {
              rows.push({ item: `${this.formatKeyForDisplay(key)} ${index + 1}`, value: 'View', linkUrl: url });
            });
            return;
          }
          if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
            rows.push({ item: this.formatKeyForDisplay(key), value: this.friendlyFileName(value), linkUrl: value });
            return;
          }
          if (typeof value === 'object' && value !== null && 'mediaFiles' in value && Array.isArray((value as any).mediaFiles)) {
            const obj = value as any;
            const text = obj.text ?? obj.content ?? obj.comment ?? obj.notes ?? obj.note ?? obj.message ?? obj.body;
            if (text) rows.push({ item: this.formatKeyForDisplay(key), value: this.formatValueForDisplay(text) });
            (obj.mediaFiles as string[]).forEach((url: string, index: number) => {
              if (typeof url === 'string') rows.push({ item: `${this.formatKeyForDisplay(key)} File ${index + 1}`, value: this.friendlyFileName(url), linkUrl: url });
            });
            return;
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            const url = obj.url ?? obj.link ?? obj.file ?? obj.src ?? obj.path;
            if (url && typeof url === 'string' && /^https?:\/\//i.test(url)) {
              rows.push({ item: this.formatKeyForDisplay(key), value: this.friendlyFileName(url), linkUrl: url });
              return;
            }
          }
          const displayValue = this.formatValueForDisplay(value);
          if (!displayValue) return;
          // Filtrar displayValues que empiezan con "none" (ej: "none LF", "none SF")
          const dvLower = displayValue.toString().toLowerCase().trim();
          if (dvLower === 'none' || dvLower.startsWith('none ') || dvLower === 'no' || dvLower === 'n/a') return;
          rows.push({ item: this.formatKeyForDisplay(key), value: displayValue });
        });

        return rows;
      };

      // Render de imagen embebida
      const renderImageFile = (file: FileWithData, labelText?: string) => {
        if (!file.imageBuffer) return false;
        checkPageBreak(140);
        try {
          const imgWidth = pageWidth;
          const imgHeight = Math.min(200, pageWidth * 0.65);
          doc.strokeColor(fogColor).lineWidth(0.4)
            .roundedRect(doc.page.margins.left - 1, doc.y - 1, imgWidth + 2, imgHeight + 2, 3)
            .stroke();
          doc.image(file.imageBuffer, doc.page.margins.left, doc.y, { width: imgWidth, height: imgHeight });
          doc.y += imgHeight + 6;
          if (labelText) {
            doc.font('Helvetica').fontSize(8).fillColor(slateColor);
            doc.text(labelText, doc.page.margins.left, doc.y, { width: pageWidth });
            doc.y += 8;
          }
          return true;
        } catch (err) {
          this.logger.warn(`Error incrustando imagen en PDF: ${err}`);
          return false;
        }
      };

      // Render de link de archivo (no imagen)
      const renderFileLink = (file: FileWithData) => {
        const linkCardH = 24;
        checkPageBreak(linkCardH + 6);
        doc.save();
        doc.fillColor(rowAltColor).roundedRect(doc.page.margins.left, doc.y, pageWidth, linkCardH, 4).fill();
        doc.strokeColor(fogColor).lineWidth(0.3).roundedRect(doc.page.margins.left, doc.y, pageWidth, linkCardH, 4).stroke();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(clayColor);
        const typeLabel = this.isImageUrl(file.url) ? 'IMAGE' : (file.url.match(/\.(mp4|mov|mkv|avi|webm)/i) ? 'VIDEO' : 'FILE');
        doc.text(typeLabel, doc.page.margins.left + 8, doc.y + 5, { width: 50 });
        const typeLabelW = doc.widthOfString(typeLabel);
        doc.strokeColor(fogColor).lineWidth(0.3)
          .moveTo(doc.page.margins.left + 8 + typeLabelW + 4, doc.y - 2)
          .lineTo(doc.page.margins.left + 8 + typeLabelW + 4, doc.y + linkCardH - 4)
          .stroke();
        const friendlyName = this.friendlyFileName(file.url);
        const truncatedName = friendlyName.length > 60 ? friendlyName.substring(0, 57) + '...' : friendlyName;
        doc.font('Helvetica').fontSize(9).fillColor(primaryColor);
        doc.text(truncatedName, doc.page.margins.left + 8 + typeLabelW + 10, doc.y + 5, {
          width: pageWidth - 16 - typeLabelW - 10,
          link: file.presignedUrl,
          underline: true,
        });
        doc.restore();
        doc.y += linkCardH + 5;
      };

      // Render de un archivo (imagen embebida o link)
      const renderFile = (file: FileWithData, labelText?: string) => {
        if (file.imageBuffer) {
          renderImageFile(file, labelText);
        } else {
          renderFileLink(file);
        }
      };

      // ══════════════════════════════════════════
      // INICIO DEL DOCUMENTO
      // ══════════════════════════════════════════
      drawPageBackground();

      // ── HEADER ── barra pine + fondo sand
      const headerHeight = 50;
      doc.save();
      doc.fillColor(primaryColor).rect(0, 0, doc.page.width, 3).fill();
      doc.fillColor(sandColor).rect(0, 3, doc.page.width, headerHeight - 3).fill();
      const baX = doc.page.margins.left;
      const baY = doc.page.margins.top + 2;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(textColor);
      doc.text('BA', baX, baY, { continued: true });
      doc.fillColor(primaryColor);
      doc.text(' Kitchen & Bath Design', { continued: false });
      doc.font('Helvetica').fontSize(7).fillColor(slateColor);
      doc.text('PROFESSIONAL ESTIMATE REPORT', doc.page.margins.left, baY + 4, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'right',
      });
      doc.restore();
      doc.strokeColor(primaryColor).lineWidth(0.6)
        .moveTo(0, headerHeight).lineTo(doc.page.width, headerHeight).stroke();
      doc.y = headerHeight + 16;

      // ── HERO: "Estimate v{n}" izquierda + Total derecha ──
      const titleY = doc.y;
      const totalStr = `$${quote.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Título izquierdo: "Estimate v1" en dos colores
      doc.save();
      doc.font('Helvetica-Bold').fontSize(22).fillColor(textColor);
      doc.text('Estimate ', doc.page.margins.left, titleY, { continued: true });
      doc.fillColor(primaryColor);
      doc.text(`v${quote.versionNumber}`, { continued: false });
      doc.restore();

      // Label "TOTAL COST" a la derecha (fontSize 8, align right)
      doc.save();
      doc.font('Helvetica').fontSize(8).fillColor(clayColor);
      doc.text('TOTAL COST', doc.page.margins.left, titleY + 2, {
        width: pageWidth,
        align: 'right',
        lineBreak: false,
      });
      doc.restore();

      // Monto total a la derecha (fontSize 22, align right)
      doc.save();
      doc.font('Helvetica-Bold').fontSize(22).fillColor(textColor);
      doc.text(totalStr, doc.page.margins.left, titleY + 14, {
        width: pageWidth,
        align: 'right',
        lineBreak: false,
      });
      doc.restore();

      // Fecha
      doc.save();
      doc.font('Helvetica').fontSize(9).fillColor(slateColor);
      doc.text(creationDate, doc.page.margins.left, titleY + 42);
      doc.restore();

      doc.y = titleY + 58;

      // ── DOS TARJETAS: Customer Information + Project Details ──
      const infoCardW = (pageWidth - 12) / 2;
      const notesText = quote.notes || '';
      // Calcular altura del card de proyecto
      const projCardBaseH = 80;
      const projCardNotesH = notesText
        ? (doc.font('Helvetica').fontSize(8).heightOfString(notesText, { width: infoCardW - 16 }) + 20)
        : 0;
      const infoCardH = Math.max(projCardBaseH, projCardBaseH + projCardNotesH);
      const infoCardY = doc.y;

      // Customer card
      doc.save();
      doc.fillColor('#FFFFFF').roundedRect(doc.page.margins.left, infoCardY, infoCardW, infoCardH, 5).fill();
      doc.strokeColor(fogColor).lineWidth(0.4).roundedRect(doc.page.margins.left, infoCardY, infoCardW, infoCardH, 5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(clayColor);
      doc.text('CUSTOMER INFORMATION', doc.page.margins.left + 8, infoCardY + 8, { width: infoCardW - 16 });
      doc.strokeColor(fogColor).lineWidth(0.3)
        .moveTo(doc.page.margins.left + 8, infoCardY + 19)
        .lineTo(doc.page.margins.left + infoCardW - 8, infoCardY + 19).stroke();
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textColor);
      doc.text(customerName, doc.page.margins.left + 8, infoCardY + 24);
      doc.font('Helvetica').fontSize(9).fillColor(primaryColor);
      doc.text(customerEmail, doc.page.margins.left + 8, infoCardY + 38);
      doc.fillColor(slateColor);
      doc.text(customerPhone, doc.page.margins.left + 8, infoCardY + 52);
      doc.restore();

      // Project Details card
      const projCardX = doc.page.margins.left + infoCardW + 12;
      doc.save();
      doc.fillColor('#FFFFFF').roundedRect(projCardX, infoCardY, infoCardW, infoCardH, 5).fill();
      doc.strokeColor(fogColor).lineWidth(0.4).roundedRect(projCardX, infoCardY, infoCardW, infoCardH, 5).stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(clayColor);
      doc.text('PROJECT DETAILS', projCardX + 8, infoCardY + 8, { width: infoCardW - 16 });
      doc.strokeColor(fogColor).lineWidth(0.3)
        .moveTo(projCardX + 8, infoCardY + 19)
        .lineTo(projCardX + infoCardW - 8, infoCardY + 19).stroke();
      doc.font('Helvetica').fontSize(8.5).fillColor(slateColor);
      doc.text('Experience Level', projCardX + 8, infoCardY + 24);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(textColor);
      doc.text(experience, projCardX + 8, infoCardY + 34);
      let projY = infoCardY + 50;
      if (notesText) {
        doc.font('Helvetica').fontSize(8).fillColor(slateColor);
        doc.text('Notes', projCardX + 8, projY);
        projY += 10;
        doc.font('Helvetica').fontSize(8.5).fillColor(textColor);
        doc.text(notesText, projCardX + 8, projY, { width: infoCardW - 16 });
      }
      doc.restore();

      doc.y = infoCardY + infoCardH + 20;

      // ══════════════════════════════════════════
      // SECCIÓN: INFORMACIÓN DE LA CATEGORÍA
      // ══════════════════════════════════════════
      const categoryTitle =
        quote.category === QuoteCategory.KITCHEN ? 'Kitchen Information'
          : quote.category === QuoteCategory.BATHROOM ? 'Bathroom Information'
            : quote.category === QuoteCategory.BASEMENT ? 'Basement Information'
              : quote.category === QuoteCategory.ADDITIONAL_WORK ? 'Additional Work Information'
                : 'Estimate Information';

      const infoBlocks: Array<{ title: string; data?: Record<string, unknown>; isSubCategory?: boolean }> = [];
      if (quote.kitchenInformation) {
        infoBlocks.push({ title: categoryTitle, data: quote.kitchenInformation as Record<string, unknown> });
      }
      if (quote.bathroomInformation) {
        infoBlocks.push({ title: 'Bathroom Information', data: quote.bathroomInformation as Record<string, unknown> });
      }
      if (quote.basementInformation) {
        infoBlocks.push({ title: 'Basement Information', data: quote.basementInformation as Record<string, unknown> });
      }
      if (quote.additionalWorkInformation) {
        infoBlocks.push({ title: 'Additional Work Information', data: quote.additionalWorkInformation as Record<string, unknown> });
      }

      infoBlocks.forEach((block) => {
        const rows = buildKeyValueRows(block.data, MEDIA_KEYS_TO_EXCLUDE);
        if (!rows.length) return;
        drawSectionBar(block.title);
        drawKeyValueTable(rows);
      });

      // ══════════════════════════════════════════
      // SECCIÓN: COUNTERTOPS FILES
      // ══════════════════════════════════════════
      const countertopsData = filesBySection('countertops');
      if (countertopsData.length > 0) {
        drawSectionBar('Countertops Files');
        for (const file of countertopsData) {
          const label = countertopsData.length > 1 ? file.label : undefined;
          renderFile(file, label);
          doc.y += 4;
        }
        doc.y += 4;
      }

      // ══════════════════════════════════════════
      // SECCIÓN: BACKSPLASH FILES
      // ══════════════════════════════════════════
      const backsplashData = filesBySection('backsplash');
      if (backsplashData.length > 0) {
        drawSectionBar('Backsplash Files');
        for (const file of backsplashData) {
          const label = backsplashData.length > 1 ? file.label : undefined;
          renderFile(file, label);
          doc.y += 4;
        }
        doc.y += 4;
      }

      // ══════════════════════════════════════════
      // SECCIÓN: MATERIALS LIST
      // ══════════════════════════════════════════
      const materialsFileData = filesBySection('materials');
      const hasMaterials = materialsFileData.length > 0 || (quote.materials?.items?.length ?? 0) > 0;
      if (hasMaterials) {
        drawSectionBar('Materials List');

        // Materials file
        if (materialsFileData.length > 0) {
          checkPageBreak(20);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
          doc.text('Materials File', doc.page.margins.left + 2, doc.y);
          doc.y += 8;
          renderFile(materialsFileData[0]);
        }

        // Materials items table
        if (quote.materials?.items?.length) {
          checkPageBreak(40);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
          doc.text('Materials Items', doc.page.margins.left + 2, doc.y);
          doc.y += 10;

          const col1W = pageWidth * 0.22;
          const col2W = pageWidth * 0.78;
          const rowH = 10;

          // Header de tabla
          doc.save();
          doc.fillColor('#F0F0F0').rect(doc.page.margins.left + 2, doc.y - 4, pageWidth - 4, rowH).fill();
          doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
          doc.text('Quantity', doc.page.margins.left + 6, doc.y);
          doc.text('Description', doc.page.margins.left + col1W + 6, doc.y);
          doc.restore();
          doc.y += rowH + 4;

          for (const item of quote.materials.items) {
            checkPageBreak(18);
            doc.strokeColor('#F0F0F0').lineWidth(0.1)
              .moveTo(doc.page.margins.left + 2, doc.y - 2)
              .lineTo(doc.page.margins.left + pageWidth - 2, doc.y - 2).stroke();
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text(String(item.quantity), doc.page.margins.left + 6, doc.y, { width: col1W });
            doc.font('Helvetica').fontSize(9).fillColor(slateColor);
            const descLines = doc.heightOfString(item.description, { width: col2W - 12 });
            doc.text(this.toTitleCase(item.description), doc.page.margins.left + col1W + 6, doc.y, { width: col2W - 12 });
            doc.y += Math.max(rowH, descLines);
          }
          doc.y += 8;
        }
      }

      // ══════════════════════════════════════════
      // SECCIÓN: AUDIO NOTES (interno)
      // ══════════════════════════════════════════
      if (audioNotes.length > 0) {
        drawSectionBar('Audio Notes');

        for (let i = 0; i < audioNotes.length; i++) {
          const note = audioNotes[i];
          if (!note?.url) continue;

          checkPageBreak(24);
          const noteTitle = audioNotes.length > 1 ? `Audio Note ${i + 1} of ${audioNotes.length}` : 'Audio Note';
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
          doc.text(noteTitle, doc.page.margins.left + 2, doc.y);
          doc.y += 6;

          // Link del audio
          const audioFile: FileWithData = {
            label: noteTitle,
            url: note.url,
            presignedUrl: note.url,
            section: 'audio',
          };
          renderFileLink(audioFile);

          if (note.summary) {
            checkPageBreak(30);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text('Summary:', doc.page.margins.left + 4, doc.y);
            doc.y += 5;
            doc.font('Helvetica').fontSize(8.5).fillColor(slateColor);
            doc.text(note.summary, doc.page.margins.left + 4, doc.y, { width: pageWidth - 8 });
            doc.y += doc.heightOfString(note.summary, { width: pageWidth - 8 }) + 6;
          }

          if (note.transcription) {
            checkPageBreak(30);
            doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor);
            doc.text('Transcription:', doc.page.margins.left + 4, doc.y);
            doc.y += 5;
            doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#888888');
            doc.text(note.transcription, doc.page.margins.left + 4, doc.y, { width: pageWidth - 8 });
            doc.y += doc.heightOfString(note.transcription, { width: pageWidth - 8 }) + 6;
          }

          doc.y += 6;
        }
      }

      // ══════════════════════════════════════════
      // SECCIÓN: SKETCHES & DRAWINGS
      // ══════════════════════════════════════════
      const sketchData = filesBySection('sketch');
      if (sketchData.length > 0) {
        drawSectionBar('Sketches & Drawings');
        for (const file of sketchData) {
          const label = sketchData.length > 1 ? file.label : undefined;
          renderFile(file, label);
          doc.y += 4;
        }
        doc.y += 4;
      }

      // ══════════════════════════════════════════
      // SECCIÓN: ADDITIONAL COMMENTS & MEDIA (interno)
      // ══════════════════════════════════════════
      const additionalData = filesBySection('additional');
      if (additionalCommentText || additionalData.length > 0) {
        drawSectionBar('Additional Comments & Media');

        if (additionalCommentText) {
          checkPageBreak(24);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
          doc.text('Comments', doc.page.margins.left + 2, doc.y);
          doc.y += 6;
          doc.font('Helvetica').fontSize(9).fillColor(slateColor);
          doc.text(additionalCommentText, doc.page.margins.left + 2, doc.y, { width: pageWidth - 4 });
          doc.y += doc.heightOfString(additionalCommentText, { width: pageWidth - 4 }) + 8;
        }

        if (additionalData.length > 0) {
          checkPageBreak(20);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(textColor);
          doc.text('Photos & Videos', doc.page.margins.left + 2, doc.y);
          doc.y += 8;
          for (const file of additionalData) {
            renderFile(file);
            doc.y += 4;
          }
        }
      }

      // ══════════════════════════════════════════
      // FOOTERS EN TODAS LAS PÁGINAS
      // ══════════════════════════════════════════
      const pageRange = doc.bufferedPageRange();
      for (let i = pageRange.start; i < pageRange.start + pageRange.count; i += 1) {
        doc.switchToPage(i);
        drawFooter(i - pageRange.start + 1, pageRange.count);
      }

      doc.end();
    });
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

    return pdfUrl;
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