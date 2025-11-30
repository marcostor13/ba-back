import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type LogDocument = Log & Document;

export enum LogType {
  NOTIFICATION = 'notification',
  ERROR = 'error',
}

export enum LogSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class Log {
  @Prop({ type: String, enum: LogType, required: true, index: true })
  type: LogType;

  @Prop({ type: String, enum: LogSeverity, required: false, index: true })
  severity?: LogSeverity;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false, index: true })
  companyId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false, index: true })
  userId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: false })
  source?: string;

  @Prop({ type: String, required: false })
  stackTrace?: string;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, unknown>;

  @Prop({ type: String, required: false })
  endpoint?: string;

  @Prop({ type: String, required: false })
  method?: string;

  @Prop({ type: Number, required: false })
  statusCode?: number;

  @Prop({ type: String, required: false })
  ipAddress?: string;

  @Prop({ type: String, required: false })
  userAgent?: string;

  @Prop({ type: Boolean, default: false, index: true })
  resolved?: boolean;

  @Prop({ type: Date, required: false })
  resolvedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  resolvedBy?: MongooseSchema.Types.ObjectId;
}

export const LogSchema = SchemaFactory.createForClass(Log);

// Índices para optimizar consultas
LogSchema.index({ type: 1, createdAt: -1 });
LogSchema.index({ severity: 1, createdAt: -1 });
LogSchema.index({ companyId: 1, type: 1, createdAt: -1 });
LogSchema.index({ userId: 1, createdAt: -1 });
LogSchema.index({ resolved: 1, createdAt: -1 });
LogSchema.index({ createdAt: -1 });
LogSchema.index({ source: 1, createdAt: -1 });



