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
                <span class="summary-label">Quote ID</span>
                <span class="summary-value">${quoteId}</span>
              </div>
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
                <span class="summary-value">${quote.category}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Status</span>
                <span class="summary-value">${quote.status}</span>
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
              <p class="paragraph">${quote.experience || 'No experience description provided.'}</p>
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

    const primaryGreen = '#3A7344';
    const darkCharcoal = '#332F28';
    const lightSand = '#EAD1BA';

    const customerName = customer ? `${customer.name} ${customer.lastName}`.trim() : 'N/A';
    const customerEmail = customer?.email ?? 'N/A';
    const customerPhone = (customer as any)?.phone ?? 'N/A';
    const experience = quote.experience || 'N/A';
    const status = quote.status;
    const creationDate = (quote as any)?.createdAt
      ? new Date((quote as any).createdAt).toLocaleDateString()
      : new Date().toLocaleDateString();

    const categoryLabel = quote.category?.toUpperCase?.() ?? 'ESTIMATE';

    const isInternalView = true; // Actualmente solo se envía a correos internos

    return new Promise<Buffer>((resolve, reject) => {
      // pdfkit tiene muchas APIs útiles (page, save, restore, etc.) que no están
      // completamente tipadas en nuestra declaración mínima. Usamos `any` para
      // poder aprovecharlas sin romper el tipado global.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc: any = new (PDFDocument as any)({ margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const drawPageBackground = () => {
        const { width, height } = doc.page;
        doc.save();
        doc.fillColor(lightSand);
        doc.rect(0, 0, width, height).fill();
        doc.fillColor(darkCharcoal); // Restaurar color de texto por defecto
        doc.restore();
      };

      const drawFooter = (pageNumber: number, pageCount: number) => {
        const { width, height, margins } = doc.page;
        const footerText = `Page ${pageNumber} of ${pageCount} - Generated on ${new Date().toLocaleDateString()}`;
        doc.save();
        doc.fontSize(8);
        doc.fillColor('#535353');
        doc.text(footerText, margins.left, height - margins.bottom + 10, {
          width: width - margins.left - margins.right,
          align: 'center',
        });
        doc.restore();
      };

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // Helper: heading bar for sections
      const drawSectionBar = (label: string, yOffset?: number) => {
        const top = yOffset ?? doc.y;
        const barHeight = 22;
        doc.save();
        doc.fillColor(primaryGreen);
        doc.roundedRect(doc.page.margins.left, top, pageWidth, barHeight, 4).fill();
        doc.fillColor('#FFFFFF');
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text(label.toUpperCase(), doc.page.margins.left + 10, top + 5, {
          width: pageWidth - 20,
          align: 'left',
        });
        doc.restore();
        doc.fillColor(darkCharcoal); // Restaurar color de texto por defecto
        doc.moveDown(1.8);
      };

      // Helper: information card
      const drawInfoCard = (title: string, lines: string[]) => {
        const cardMargin = 6;
        const startX = doc.page.margins.left;
        const startY = doc.y;

        const cardWidth = pageWidth;
        const estimatedHeight = 100; // Altura estimada inicial

        // Dibujar fondo blanco de la tarjeta
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.roundedRect(startX, startY, cardWidth, estimatedHeight, 8).fill();
        doc.restore();

        // Calcular altura real del contenido
        doc.save();
        doc.font('Helvetica-Bold').fontSize(11);
        const titleHeight = doc.heightOfString(title.toUpperCase(), { width: cardWidth - cardMargin * 2 });
        doc.font('Helvetica').fontSize(10);
        let contentHeight = titleHeight + 6; // espacio después del título
        lines.forEach((line) => {
          contentHeight += doc.heightOfString(line, { width: cardWidth - cardMargin * 2 }) + 4;
        });
        doc.restore();

        const actualHeight = contentHeight + cardMargin * 2 + 8;

        // Redibujar fondo con altura correcta
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.roundedRect(startX, startY, cardWidth, actualHeight, 8).fill();
        doc.restore();

        // Dibujar texto
        doc.save();
        doc.fillColor(darkCharcoal);
        doc.font('Helvetica-Bold').fontSize(11);
        doc.text(title.toUpperCase(), startX + cardMargin, startY + cardMargin, {
          width: cardWidth - cardMargin * 2,
        });
        
        let textY = startY + cardMargin + titleHeight + 6;
        doc.font('Helvetica').fontSize(10);
        lines.forEach((line) => {
          doc.text(line, startX + cardMargin, textY, {
            width: cardWidth - cardMargin * 2,
          });
          textY += doc.heightOfString(line, { width: cardWidth - cardMargin * 2 }) + 4;
        });
        doc.restore();

        // Dibujar borde
        doc.save();
        doc.roundedRect(startX, startY, cardWidth, actualHeight, 8)
          .lineWidth(0.5)
          .strokeColor('#D0BBA4')
          .stroke();
        doc.restore();

        doc.y = startY + actualHeight + 12;
        doc.fillColor(darkCharcoal); // Asegurar color de texto para siguiente contenido
      };

      const drawTotalCard = (total: number) => {
        const cardHeight = 70;
        const startX = doc.page.margins.left;
        const startY = doc.y;

        doc.save();
        doc.fillColor(primaryGreen);
        doc.roundedRect(startX, startY, pageWidth, cardHeight, 10)
          .fill()
          .strokeColor('#2b5733')
          .lineWidth(1)
          .stroke();

        doc.fillColor('#FFFFFF');
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('TOTAL ESTIMATE', startX + 16, startY + 14, {
          width: pageWidth - 32,
          align: 'left',
        });

        doc.fontSize(22);
        doc.text(`$ ${total.toFixed(2)}`, startX + 16, startY + 30, {
          width: pageWidth - 32,
          align: 'left',
        });
        doc.restore();

        doc.y = startY + cardHeight + 16;
        doc.fillColor(darkCharcoal); // Restaurar color de texto por defecto
      };

      const drawKeyValueTable = (
        title: string,
        rows: Array<{ item: string; value: string | number | boolean; linkUrl?: string }>,
      ) => {
        if (!rows.length) return;

        drawSectionBar(title);

        const tableX = doc.page.margins.left;
        const tableY = doc.y;
        const itemColWidth = pageWidth * 0.65;
        const valueColWidth = pageWidth - itemColWidth;

        const rowHeight = 18;
        let currentY = tableY;

        doc.font('Helvetica-Bold').fontSize(9);
        doc.fillColor(darkCharcoal);
        doc.text('Item', tableX + 6, currentY + 4, { width: itemColWidth - 12 });
        doc.text('Value', tableX + itemColWidth + 6, currentY + 4, {
          width: valueColWidth - 12,
        });
        doc.rect(tableX, currentY, pageWidth, rowHeight).strokeColor('#C7B39C').lineWidth(0.5).stroke();

        currentY += rowHeight;

        doc.font('Helvetica').fontSize(9);

        rows.forEach((row, index) => {
          const isEven = index % 2 === 1;
          if (currentY + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
            doc.addPage();
            drawPageBackground();
            currentY = doc.page.margins.top;
          }

          doc.save();
          if (isEven) {
            doc.fillColor('#F7EEE5');
          } else {
            doc.fillColor('#FFFFFF');
          }
          doc.rect(tableX, currentY, pageWidth, rowHeight).fill();
          doc.restore();

          doc.save();
          doc.fillColor(darkCharcoal);
          doc.text(row.item, tableX + 6, currentY + 4, { width: itemColWidth - 12 });
          const valueText = String(row.value);
          if (row.linkUrl) {
            doc.text(valueText, tableX + itemColWidth + 6, currentY + 4, {
              width: valueColWidth - 12,
              link: row.linkUrl,
              underline: true,
            });
          } else {
            doc.text(valueText, tableX + itemColWidth + 6, currentY + 4, {
              width: valueColWidth - 12,
            });
          }
          doc.restore();

          currentY += rowHeight;
        });

        doc.y = currentY + 12;
      };

      const buildKeyValueRows = (data?: Record<string, unknown>) => {
        if (!data) {
          return [] as Array<{ item: string; value: string | number | boolean; linkUrl?: string }>;
        }
        const entries = Object.entries(data).filter(
          ([, value]) =>
            value !== undefined && value !== null && value !== '' && value !== false,
        );
        const rows: Array<{ item: string; value: string | number | boolean; linkUrl?: string }> = [];

        entries.forEach(([key, value]) => {
          // Arrays de URLs (ej. archivos)
          if (Array.isArray(value) && value.length && typeof value[0] === 'string') {
            (value as string[]).forEach((url, index) => {
              rows.push({
                item: `${key} ${index + 1}`,
                value: 'View',
                linkUrl: url,
              });
            });
            return;
          }

          // Valor tipo URL string
          if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
            rows.push({
              item: key,
              value: 'View',
              linkUrl: value,
            });
            return;
          }

          // Objetos complejos (evitar [object Object] en tabla genérica)
          if (typeof value === 'object') {
            // De momento se ignoran aquí; se pueden representar en secciones específicas.
            return;
          }

          rows.push({
            item: key,
            value: typeof value === 'number' || typeof value === 'boolean' ? value : String(value),
          });
        });

        return rows;
      };

      // First page background
      drawPageBackground();

      // === HEADER / COVER ===
      const headerHeight = 70;
      doc.save();
      doc.fillColor(lightSand);
      doc.rect(doc.page.margins.left * 0.5, doc.page.margins.top * 0.5, doc.page.width - doc.page.margins.left, headerHeight)
        .fill();
      doc.restore();

      doc.save();
      doc.fillColor(darkCharcoal);
      doc.font('Helvetica-Bold').fontSize(26);
      doc.text('BA Kitchen & Bath Design', doc.page.margins.left, doc.page.margins.top + 10, {
        width: pageWidth,
        align: 'center',
      });

      doc.fontSize(13);
      doc.text('PROFESSIONAL ESTIMATE REPORT', doc.page.margins.left, doc.page.margins.top + 40, {
        width: pageWidth,
        align: 'center',
      });
      doc.restore();
      doc.fillColor(darkCharcoal); // Asegurar color de texto por defecto

      // Thin green line
      doc.save();
      doc.moveTo(doc.page.margins.left, doc.page.margins.top + headerHeight + 10)
        .lineTo(doc.page.margins.left + pageWidth, doc.page.margins.top + headerHeight + 10)
        .strokeColor(primaryGreen)
        .lineWidth(2)
        .stroke();
      doc.restore();

      doc.y = doc.page.margins.top + headerHeight + 30;

      // === ESTIMATE TITLE BAR ===
      const barHeight = 26;
      const barWidth = pageWidth * 0.8;
      const barX = doc.page.margins.left + (pageWidth - barWidth) / 2;
      const barY = doc.y;
      doc.save();
      doc.fillColor(primaryGreen);
      doc.roundedRect(barX, barY, barWidth, barHeight, 12).fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12);
      doc.text(
        `Estimate v${quote.versionNumber} - ${categoryLabel}`,
        barX,
        barY + 6,
        { width: barWidth, align: 'center' },
      );
      doc.restore();
      doc.fillColor(darkCharcoal); // Restaurar color de texto por defecto

      doc.y = barY + barHeight + 24;

      // === MAIN INFO BLOCKS ===
      drawInfoCard('CUSTOMER INFORMATION', [
        `Name: ${customerName}`,
        `Email: ${customerEmail}`,
        `Phone: ${customerPhone}`,
      ]);

      drawInfoCard('PROJECT DETAILS', [
        `Experience: ${experience}`,
        `Status: ${status}`,
        `Date: ${creationDate}`,
        `Project: ${project?.name ?? 'N/A'}`,
      ]);

      // === TOTAL HIGHLIGHT ===
      drawTotalCard(quote.totalPrice);

      // === NOTES (INTERNAL ONLY) ===
      if (isInternalView) {
        const notesText = quote.notes || 'No additional notes.';
        drawSectionBar('Notes');
        doc.save();
        doc.fillColor('#FFFFFF');
        doc.roundedRect(doc.page.margins.left, doc.y, pageWidth, 80, 8)
          .fill()
          .strokeColor('#D0BBA4')
          .lineWidth(0.5)
          .stroke();
        doc.restore();

        doc.save();
        doc.font('Helvetica').fontSize(10).fillColor(darkCharcoal);
        doc.text(notesText, doc.page.margins.left + 10, doc.y + 10, {
          width: pageWidth - 20,
          align: 'left',
        });
        doc.restore();
        doc.fillColor(darkCharcoal); // Restaurar color de texto

        doc.y += 80 + 16;
      }

      // === CATEGORY INFORMATION SECTION ===
      const categoryTitle =
        quote.category === QuoteCategory.KITCHEN
          ? 'KITCHEN INFORMATION'
          : quote.category === QuoteCategory.BATHROOM
            ? 'BATHROOM INFORMATION'
            : quote.category === QuoteCategory.BASEMENT
              ? 'BASEMENT INFORMATION'
              : quote.category === QuoteCategory.ADDITIONAL_WORK
                ? 'ADDITIONAL WORK INFORMATION'
                : 'ESTIMATE INFORMATION';

      drawSectionBar(categoryTitle);

      const infoBlocks: Array<{ title: string; data?: Record<string, unknown> }> = [];
      if (quote.kitchenInformation) {
        infoBlocks.push({
          title: 'Kitchen Details',
          data: quote.kitchenInformation as Record<string, unknown>,
        });
      }
      if (quote.bathroomInformation) {
        infoBlocks.push({
          title: 'Bathroom Details',
          data: quote.bathroomInformation as Record<string, unknown>,
        });
      }
      if (quote.basementInformation) {
        infoBlocks.push({
          title: 'Basement Details',
          data: quote.basementInformation as Record<string, unknown>,
        });
      }
      if (quote.additionalWorkInformation) {
        infoBlocks.push({
          title: 'Additional Work Details',
          data: quote.additionalWorkInformation as Record<string, unknown>,
        });
      }

      infoBlocks.forEach((block, index) => {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 120) {
          doc.addPage();
          drawPageBackground();
        }

        drawSectionBar(block.title, doc.y);
        const rows = buildKeyValueRows(block.data);
        if (rows.length) {
          drawKeyValueTable(block.title, rows);
        }

        if (index < infoBlocks.length - 1) {
          doc.moveDown(1);
        }
      });

      // === FILES & MATERIALS SECTIONS ===
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

      if (allFiles.length || quote.materials?.items?.length) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 140) {
          doc.addPage();
          drawPageBackground();
        }
      }

      if (allFiles.length) {
        drawSectionBar('Files & Attachments');
        doc.font('Helvetica').fontSize(9).fillColor(darkCharcoal);
        allFiles.forEach((file) => {
          doc
            .fillColor(primaryGreen)
            .text(`${file.label}: View`, {
              link: file.url,
              underline: true,
            })
            .fillColor(darkCharcoal);
          doc.moveDown(0.2);
        });
      }

      if (quote.materials?.items?.length) {
        drawSectionBar('Materials');
        const materialRows = quote.materials.items.map((m) => ({
          item: String(m.quantity),
          value: m.description,
        }));
        drawKeyValueTable('Materials', materialRows);
      }

      // === INTERNAL ONLY: ADDITIONAL COMMENTS & AUDIO NOTES PLACEHOLDER ===
      if (isInternalView) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 140) {
          doc.addPage();
          drawPageBackground();
        }

        drawSectionBar('Additional Comments & Media');
        doc.font('Helvetica').fontSize(9).fillColor(darkCharcoal);
        doc.text(
          'Internal section reserved for design team comments, sketches, drawings and associated media. (To be extended with concrete data when available).',
          {
            width: pageWidth,
          },
        );
        doc.moveDown(2);

        drawSectionBar('Audio Notes');
        doc.text(
          'Internal section listing audio notes, summaries and transcriptions (if provided for this estimate).',
          {
            width: pageWidth,
          },
        );
      }

      // === FOOTERS FOR ALL PAGES ===
      // El fondo ya se dibuja al crear cada página; aquí solo añadimos el footer
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