import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface UserDocument extends Document {
    _id: Types.ObjectId;
    email: string;
    name: string;
    password: string;
    resetCodeHash?: string;
    resetCodeExpiresAt?: Date;
    verificationCodeHash?: string;
    verificationCodeExpiresAt?: Date;
    registrationData?: {
        name: string;
        password: string;
    };
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

    @Prop({ required: false })
    verificationCodeHash?: string;

    @Prop({ type: Date, required: false })
    verificationCodeExpiresAt?: Date;

    @Prop({ type: Object, required: false })
    registrationData?: {
        name: string;
        password: string;
    };
}

export const UserSchema = SchemaFactory.createForClass(User);
