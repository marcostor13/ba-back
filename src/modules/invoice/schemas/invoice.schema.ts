import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Schema({ _id: false })
export class PaymentInstallment {
  @Prop({ type: String, required: true })
  name: string; // "Initial Deposit", "Final Payment", etc.

  @Prop({ type: Number, required: true })
  percentage: number; // e.g. 50 (for 50%)

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: ['pending', 'paid'], default: 'pending' })
  status: string;

  @Prop({ type: Date, required: false })
  dueDate?: Date;
  
  // Referencia al ID del pago si ya se realizó
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment', required: false })
  paymentId?: MongooseSchema.Types.ObjectId;
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Quote', required: true })
  quoteId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  invoiceNumber: string; // e.g. "INV-001"

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop({ type: [SchemaFactory.createForClass(PaymentInstallment)], required: true })
  paymentPlan: PaymentInstallment[];

  @Prop({ type: String, required: false })
  notes?: string;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ projectId: 1 });
InvoiceSchema.index({ quoteId: 1 });

