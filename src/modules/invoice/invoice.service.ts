import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceStatus, PaymentInstallment } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Quote } from '../quote/schemas/quote.schema';
import { Project } from '../project/schemas/project.schema';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto, userId: string): Promise<Invoice> {
    const { quoteId, paymentPlan } = createInvoiceDto;

    // 1. Validar Quote
    const quote = await this.quoteModel.findById(quoteId).exec();
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    // 2. Validar porcentajes del plan de pago
    const totalPercentage = paymentPlan.reduce((sum, item) => sum + item.percentage, 0);
    // Permitimos un margen pequeño por errores de punto flotante
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException('Payment plan percentages must sum to 100%');
    }

    // 3. Generar número de factura (simple por ahora, Timestamp + Random)
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 4. Construir Installments con montos calculados
    const totalAmount = quote.totalPrice;
    const installments: PaymentInstallment[] = paymentPlan.map((plan) => ({
      name: plan.name,
      percentage: plan.percentage,
      amount: Number((totalAmount * (plan.percentage / 100)).toFixed(2)),
      status: 'pending',
      dueDate: plan.dueDate,
    }));
    
    // Ajustar centavos en el último installment si es necesario
    const calculatedTotal = installments.reduce((sum, item) => sum + item.amount, 0);
    const diff = totalAmount - calculatedTotal;
    if (diff !== 0 && installments.length > 0) {
      installments[installments.length - 1].amount += diff;
      installments[installments.length - 1].amount = Number(installments[installments.length - 1].amount.toFixed(2));
    }

    // 5. Crear Factura
    const newInvoice = new this.invoiceModel({
      quoteId: new Types.ObjectId(quoteId),
      projectId: quote.projectId,
      companyId: quote.companyId,
      customerId: quote.customerId,
      invoiceNumber,
      totalAmount,
      paidAmount: 0,
      currency: 'USD',
      status: InvoiceStatus.SENT, // Se asume enviada al crear
      paymentPlan: installments,
      notes: createInvoiceDto.notes,
      createdBy: new Types.ObjectId(userId),
    });

    return newInvoice.save();
  }

  async findAll(companyId?: string, projectId?: string): Promise<Invoice[]> {
    const filter: any = {};
    if (companyId) filter.companyId = new Types.ObjectId(companyId);
    if (projectId) filter.projectId = new Types.ObjectId(projectId);
    
    return this.invoiceModel
      .find(filter)
      .populate('quoteId', 'versionNumber totalPrice')
      .populate('customerId', 'name lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findById(id)
      .populate('quoteId')
      .populate('projectId')
      .populate('customerId')
      .populate('companyId')
      .exec();
      
    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }
    return invoice;
  }
}

