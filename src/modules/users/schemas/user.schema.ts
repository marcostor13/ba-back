import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface UserDocument extends Document {
    _id: Types.ObjectId;
    email: string;
    name: string;
    password: string;
    resetCodeHash?: string;
    resetCodeExpiresAt?: Date;
}

@Schema()
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: false })
    resetCodeHash?: string;

    @Prop({ type: Date, required: false })
    resetCodeExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
