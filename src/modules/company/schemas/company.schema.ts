import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: Object, required: false })
  configuration?: Record<string, unknown>;

  @Prop({ type: Boolean, default: true })
  active: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.index({ name: 1 });
CompanySchema.index({ active: 1 });

