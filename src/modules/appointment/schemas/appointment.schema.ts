import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum AppointmentType {
  MEASUREMENT = 'measurement',
  INSTALLATION = 'installation',
  INSPECTION = 'inspection',
  CONSULTATION = 'consultation',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, enum: AppointmentType, default: AppointmentType.OTHER })
  type: AppointmentType;

  @Prop({ type: String, required: false })
  notes?: string;

  @Prop({ type: String, enum: AppointmentStatus, default: AppointmentStatus.SCHEDULED })
  status: AppointmentStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  createdBy?: MongooseSchema.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

AppointmentSchema.index({ projectId: 1, date: 1 });
AppointmentSchema.index({ status: 1 });
