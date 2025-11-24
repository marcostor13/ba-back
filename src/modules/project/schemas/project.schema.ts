import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ProjectDocument = Project & Document;

export enum ProjectStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectType {
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  BASEMENT = 'basement',
  ADDITIONAL_WORK = 'additional-work',
}

@Schema({ timestamps: true })
export class Project {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, enum: ProjectType, required: true })
  projectType: ProjectType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  customerId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  estimatorId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  approvedQuoteId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: ProjectStatus, default: ProjectStatus.PENDING })
  status: ProjectStatus;

  @Prop({ type: Date, required: false })
  startDate?: Date;

  @Prop({ type: Date, required: false })
  expectedEndDate?: Date;

  @Prop({ type: Date, required: false })
  actualEndDate?: Date;

  @Prop({ type: Number, required: false })
  budget?: number;

  @Prop({ type: Array, required: false })
  milestones?: Array<{
    name: string;
    description?: string;
    dueDate?: Date;
    completed: boolean;
    completedDate?: Date;
  }>;

  @Prop({ type: Array, required: false })
  updates?: Array<{
    title: string;
    description: string;
    date: Date;
    userId: MongooseSchema.Types.ObjectId;
    attachments?: string[];
  }>;

  @Prop({ type: Array, required: false })
  photos?: string[];

  @Prop({ type: String, required: false })
  notes?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

ProjectSchema.index({ companyId: 1, createdAt: -1 });
ProjectSchema.index({ customerId: 1 });
ProjectSchema.index({ estimatorId: 1 });
ProjectSchema.index({ status: 1, companyId: 1 });
ProjectSchema.index({ approvedQuoteId: 1 });

