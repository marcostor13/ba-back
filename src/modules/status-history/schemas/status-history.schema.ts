import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class StatusHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  entityId: Types.ObjectId;

  @Prop({ required: true, enum: ['quote', 'project'] })
  entityType: string;

  @Prop({ required: false })
  fromStatus: string;

  @Prop({ required: true })
  toStatus: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  userId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  companyId: Types.ObjectId;

  createdAt: Date;
}

export type StatusHistoryDocument = StatusHistory & Document;
export const StatusHistorySchema = SchemaFactory.createForClass(StatusHistory);

// Index for performance
StatusHistorySchema.index({ entityId: 1, entityType: 1 });
StatusHistorySchema.index({ companyId: 1, createdAt: 1 });
