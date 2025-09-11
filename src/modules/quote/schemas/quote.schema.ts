import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true })
export class Quote {
    @Prop({ type: Object, required: true })
    data: Record<string, unknown>;

    @Prop({ type: String, default: 'kitchen' })
    category: string;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);

QuoteSchema.index({ category: 1, createdAt: -1 });


