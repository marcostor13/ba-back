import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuoteDocument = Quote & Document;

@Schema({ timestamps: true })
export class Quote {
    @Prop({ type: Object, required: true })
    customer: Record<string, unknown>;

    @Prop({ type: Object, required: true })
    company: Record<string, unknown>;

    @Prop({ type: Object, required: false })
    kitchenInformation?: Record<string, unknown>;

    @Prop({ type: Object, required: false })
    materials?: unknown;

    @Prop({ type: String, required: true })
    experience: string;

    @Prop({ type: Number, required: false })
    totalPrice?: number;

    @Prop({ type: Object, required: false })
    formData?: Record<string, unknown>;

    @Prop({ type: String, default: 'kitchen' })
    category: string;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);

QuoteSchema.index({ category: 1, createdAt: -1 });


