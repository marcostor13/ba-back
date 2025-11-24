import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentMethod {
  STRIPE = 'stripe',
  CASH = 'cash',
  CHECK = 'check',
  TRANSFER = 'transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Invoice', required: true })
  invoiceId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Customer', required: true })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, required: true, default: 'USD' })
  currency: string;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  // Stripe specific fields
  @Prop({ type: String, required: false })
  stripePaymentIntentId?: string;

  @Prop({ type: String, required: false })
  stripeChargeId?: string;

  @Prop({ type: Date, default: Date.now })
  paymentDate: Date;

  @Prop({ type: String, required: false })
  notes?: string;
  
  // Referencia al índice del plan de pagos que este pago cubre (opcional)
  @Prop({ type: Number, required: false })
  installmentIndex?: number;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ companyId: 1 });
PaymentSchema.index({ customerId: 1 });
