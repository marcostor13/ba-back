import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = Notification & Document;

/** Tipos de notificación soportados. Cualquier módulo puede emitir estos tipos. */
export enum NotificationType {
  QUOTE_SENT = 'quote_sent',
  QUOTE_CHANGES_REQUESTED = 'quote_changes_requested',
  APPOINTMENT = 'appointment',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  PAYMENT_ENABLED = 'payment_enabled',
  PROJECT_UPDATE = 'project_update',
  GENERIC = 'generic',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload: Record<string, unknown>;

  @Prop({ type: [String], default: ['in_app'] })
  channels: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
