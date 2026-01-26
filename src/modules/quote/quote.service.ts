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
import { StatusHistoryService } from '../status-history/status-history.service';
import * as PDFDocument from 'pdfkit';

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

    const created = await this.quoteModel.create(quoteData);
    const quote = created.toObject() as Quote;

    // Record initial status
    await this.statusHistoryService.recordTransition({
      entityId: created._id.toString(),
      entityType: 'quote',
      toStatus: quote.status,
      userId: dto.userId,
      companyId: dto.companyId,
    });

    // Enviar email con PDF adjunto de forma asíncrona (no bloquear la respuesta)
    void this.sendQuoteCreatedEmail(quote, created._id.toString(), project).catch((error) => {
      this.logger.error(`Error al enviar el email de quote creada: ${error.message}`, error.stack);
    });

    return quote;
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

    const html = this.buildQuoteEmailHtml({ quote, quoteId, project, customer, company });
    const pdfBuffer = await this.generateQuotePdfBuffer({
      quote,
      quoteId,
      project,
      customer,
      company,
    });

    await this.mailService.sendMail({
      to: ['Cesarg@spicastudio.art', 'marcostor13@gmail.com'],
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

  private buildQuoteEmailHtml(params: {
    quote: Quote;
    quoteId: string;
    project: Project;
    customer: Customer | null;
    company: Company | null;
  }): string {
    const { quote, quoteId, project, customer, company } = params;

    const customerName = customer ? `${customer.name} ${customer.lastName}`.trim() : 'N/A';
    const customerEmail = customer?.email ?? 'N/A';
    const projectName = project?.name ?? 'N/A';
    const companyName = (company as any)?.name ?? 'N/A';

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
              `<li><span class="label">Qty</span> <span class="value">${item.quantity}</span> <span class="label">Item</span> <span class="value">${item.description}</span></li>`,
          )
          .join('')
        : '<li><span class="value">No specific materials listed.</span></li>';

    const notes = quote.notes
      ? `<p class="paragraph">${quote.notes}</p>`
      : '<p class="paragraph">No additional notes.</p>';

    // --- LOGIC FOR FILES SECTION (EMAIL) ---
    const allFiles: { label: string; url: string }[] = [];

    if (quote.countertopsFiles?.length) {
      quote.countertopsFiles.forEach((url, index) => {
        allFiles.push({ label: `Countertop File ${index + 1}`, url });
      });
    }
    if (quote.backsplashFiles?.length) {
      quote.backsplashFiles.forEach((url, index) => {
        allFiles.push({ label: `Backsplash File ${index + 1}`, url });
      });
    }
    if (quote.materials?.file) {
      allFiles.push({ label: 'Materials File', url: quote.materials.file });
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
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: #EAD1BA; /* Fondo Principal */
            padding: 40px 20px;
          }
          .card {
            max-width: 680px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 32px 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            color: #332F28; /* Texto/Oscuro Principal */
          }
          /* Header Branding */
          .header-row {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
          }
          .header-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background-color: #3A7344; /* Acento Verde */
            color: #FFFFFF;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          }
          .brand-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: #FFFFFF;
          }
          
          .title {
            margin: 0 0 8px;
            font-size: 24px;
            font-weight: 700;
            color: #332F28;
            letter-spacing: -0.02em;
          }
          .subtitle {
            margin: 0 0 24px;
            font-size: 14px;
            color: #535353; /* Texto Secundario */
            line-height: 1.5;
          }

          /* Summary Grid */
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px 24px;
            margin-bottom: 32px;
            padding: 20px;
            background-color: #F9F5F1; /* Tono muy suave tierra/blanco */
            border: 1px solid #EAD1BA;
            border-radius: 8px;
          }
          .summary-item {
            display: flex;
            flex-direction: column;
          }
          .summary-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #997A63; /* Acento Secundario */
            margin-bottom: 4px;
            font-weight: 600;
          }
          .summary-value {
            font-size: 14px;
            font-weight: 600;
            color: #332F28;
          }

          /* Sections */
          .section {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #EAD1BA;
          }
          .section-title {
            margin: 0 0 16px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #332F28;
          }
          
          /* Lists & Text */
          .info-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .info-list li {
            padding: 6px 0;
            font-size: 14px;
            color: #332F28;
            border-bottom: 1px dashed #E0E0E0;
          }
          .info-list li:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #997A63;
            margin-right: 6px;
            font-size: 12px;
            text-transform: uppercase;
          }
          .value {
            color: #332F28;
          }
          .paragraph {
            font-size: 14px;
            line-height: 1.6;
            color: #332F28;
            margin: 0;
          }

          /* Files Grid */
          .files-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
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
            padding: 16px;
            transition: background-color 0.2s;
          }
          .file-card:hover {
            background-color: #EAD1BA;
            border-color: #997A63;
          }
          .file-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }
          .file-label {
            font-size: 12px;
            font-weight: 600;
            color: #332F28;
            text-align: center;
            margin-bottom: 4px;
          }
          .file-action {
            font-size: 10px;
            color: #3A7344;
            text-transform: uppercase;
            font-weight: 700;
          }

          .divider {
            margin: 24px 0;
            border-top: 1px dashed #997A63;
            opacity: 0.3;
          }

          @media (max-width: 600px) {
            .card { padding: 24px; }
            .summary-grid { grid-template-columns: 1fr; }
          }
        </style>

        <div class="card">
          <div class="header-row">
            <div class="header-pill">
              <span class="brand-dot"></span>
              <span>BA Kitchen &amp; Bath Design</span>
            </div>
          </div>
          
          <h2 class="title">New Quote Created</h2>
          <p class="subtitle">
            A new project quote has been generated successfully. Please review the details below.
          </p>

          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-label">Quote ID</span>
              <span class="summary-value">${quoteId}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Price</span>
              <span class="summary-value" style="color: #3A7344;">$${quote.totalPrice.toFixed(2)}</span>
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
              <span class="summary-value">${quote.category}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Status</span>
              <span class="summary-value">${quote.status}</span>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">CUSTOMER</h3>
            <ul class="info-list">
              <li><span class="label">Name</span> <span class="value">${customerName}</span></li>
              <li><span class="label">Email</span> <span class="value">${customerEmail}</span></li>
            </ul>
          </div>

          <div class="section">
            <h3 class="section-title">EXPERIENCE / SCOPE</h3>
            <p class="paragraph">${quote.experience}</p>
          </div>

          <div class="section">
            <h3 class="section-title">MATERIALS</h3>
            <ul class="info-list">
              ${materialsItems}
            </ul>
          </div>

          ${filesSection}

          <div class="section">
            <h3 class="section-title">NOTES</h3>
            ${notes}
          </div>

          ${detailsSections}
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
      .map(
        ([key, value]) =>
          `<li><strong>${key}:</strong> ${String(value)}</li>`,
      )
      .join('');

    return `
      <h3>${title}</h3>
      <ul>
        ${items}
      </ul>
    `;
  }

  private async generateQuotePdfBuffer(params: {
    quote: Quote;
    quoteId: string;
    project: Project;
    customer: Customer | null;
    company: Company | null;
  }): Promise<Buffer> {
    const { quote, quoteId, project, customer, company } = params;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // Fondo conceptual: se recomienda exportar sobre fondo claro, pero los visores de PDF
      // no soportan un "fondo global" estándar; mantenemos la jerarquía tipográfica.
      doc.fontSize(18).text('BA Kitchen & Bath Design - Quote Summary', { underline: true });
      doc.moveDown();

      doc.fontSize(12).text(`Quote ID: ${quoteId}`);
      doc.text(`Company: ${(company as any)?.name ?? 'N/A'}`);
      doc.text(`Project: ${project?.name ?? 'N/A'}`);
      doc.text(`Category: ${quote.category}`);
      doc.text(`Status: ${quote.status}`);
      doc.text(`Version: ${quote.versionNumber}`);
      doc.text(`Total Price: $${quote.totalPrice.toFixed(2)}`);
      doc.moveDown();

      doc.fontSize(14).text('CUSTOMER', { underline: true });
      doc.moveDown(0.5);
      const customerName = customer ? `${customer.name} ${customer.lastName}`.trim() : 'N/A';
      doc.fontSize(12).text(`Name: ${customerName}`);
      doc.text(`Email: ${customer?.email ?? 'N/A'}`);
      doc.moveDown();

      doc.fontSize(14).text('EXPERIENCE / SCOPE SUMMARY', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(quote.experience || 'N/A');
      doc.moveDown();

      doc.fontSize(14).text('MATERIALS', { underline: true });
      doc.moveDown(0.5);
      if (quote.materials?.items?.length) {
        quote.materials.items.forEach((item) => {
          doc.text(`- ${item.quantity} x ${item.description}`);
        });
      } else {
        doc.text('- No specific materials listed.');
      }
      doc.moveDown();

      doc.fontSize(14).text('NOTES', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(quote.notes || 'No additional notes.');
      doc.moveDown();

      // --- ATTACHMENTS & FILES SECTION (PDF) ---
      const allFiles: { label: string; url: string }[] = [];
      if (quote.countertopsFiles?.length) {
        quote.countertopsFiles.forEach((url, index) => {
          allFiles.push({ label: `Countertop File ${index + 1}`, url });
        });
      }
      if (quote.backsplashFiles?.length) {
        quote.backsplashFiles.forEach((url, index) => {
          allFiles.push({ label: `Backsplash File ${index + 1}`, url });
        });
      }
      if (quote.materials?.file) {
        allFiles.push({ label: 'Materials File', url: quote.materials.file });
      }

      if (allFiles.length > 0) {
        doc.fontSize(14).text('ATTACHMENTS & FILES', { underline: true });
        doc.moveDown(0.5);
        allFiles.forEach((file) => {
          doc
            .fontSize(12)
            .fillColor('blue')
            .text('- ' + file.label + ' (Click to open)', {
              link: file.url,
              underline: true,
            });
        });
        doc.fillColor('black'); // Reset color
        doc.moveDown();
      }

      const addSection = (title: string, data?: Record<string, unknown>) => {
        if (!data) return;
        const entries = Object.entries(data).filter(
          ([, value]) =>
            value !== undefined && value !== null && value !== '' && value !== false,
        );
        if (!entries.length) return;

        doc.addPage();
        doc.fontSize(14).text(title.toUpperCase(), { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        entries.forEach(([key, value]) => {
          doc.text('- ' + key + ': ' + String(value));
        });
        doc.moveDown();
      };

      addSection('Kitchen Information', quote.kitchenInformation as Record<string, unknown> | undefined);
      addSection('Bathroom Information', quote.bathroomInformation as Record<string, unknown> | undefined);
      addSection('Basement Information', quote.basementInformation as Record<string, unknown> | undefined);
      addSection('Additional Work Information', quote.additionalWorkInformation as Record<string, unknown> | undefined);

      doc.end();
    });
  }

  async findAll(
    companyId?: string,
    projectId?: string,
    category?: QuoteCategory,
    status?: QuoteStatus,
    userId?: string,
  ): Promise<Quote[]> {
    const filter: Record<string, unknown> = {};

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
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