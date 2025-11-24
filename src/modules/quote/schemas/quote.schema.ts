import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  KitchenInformation,
  BathroomInformation,
  BasementInformation,
  AdditionalWorkInformation,
} from '../types/form-information.types';

export type QuoteDocument = Quote & Document;

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum QuoteCategory {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  BASEMENT = 'basement',
  ADDITIONAL_WORK = 'additional-work',
}

@Schema({ timestamps: true })
export class Quote {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Customer' })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'Company' })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  experience: string;

  @Prop({ type: String, enum: QuoteCategory, default: QuoteCategory.KITCHEN })
  category: QuoteCategory;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number, default: 1 })
  versionNumber: number;

  @Prop({ type: String, enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: String, required: false })
  notes?: string;

  // Información del formulario según la categoría
  @Prop({ type: Object, required: false })
  kitchenInformation?: KitchenInformation;

  @Prop({ type: Object, required: false })
  bathroomInformation?: BathroomInformation;

  @Prop({ type: Object, required: false })
  basementInformation?: BasementInformation;

  @Prop({ type: Object, required: false })
  additionalWorkInformation?: AdditionalWorkInformation;

  @Prop({ type: [String], required: false, default: [] })
  countertopsFiles?: string[];

  @Prop({ type: [String], required: false, default: [] })
  backsplashFiles?: string[];

  @Prop({
    type: {
      file: { type: String, required: false },
      items: {
        type: [
          {
            _id: false,
            quantity: { type: Number, required: true },
            description: { type: String, required: true },
          },
        ],
        required: false,
      },
    },
    required: false,
  })
  materials?: {
    file?: string;
    items?: Array<{ quantity: number; description: string }>;
  };
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);

QuoteSchema.index({ category: 1, createdAt: -1 });
QuoteSchema.index({ companyId: 1, createdAt: -1 });
QuoteSchema.index({ customerId: 1, createdAt: -1 });
QuoteSchema.index({ projectId: 1, createdAt: -1 });
QuoteSchema.index({ userId: 1, createdAt: -1 });
QuoteSchema.index({ projectId: 1, versionNumber: 1 });
QuoteSchema.index({ status: 1, companyId: 1 });
QuoteSchema.index({ projectId: 1, status: 1 });


