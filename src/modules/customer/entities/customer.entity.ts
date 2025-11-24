import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Schema as MongooseSchema } from 'mongoose';

export interface CustomerDocument {
  name: string;
  lastName: string;
  phone: string;
  date: Date;
  email: string;
  address: string;
  city: string;
  zipCode: string;
  state: string;
  leadSource: string;
  description: string;
  companyId?: MongooseSchema.Types.ObjectId;
  userId?: MongooseSchema.Types.ObjectId;
}

export interface GetCustomerDocument extends CustomerDocument {
  _id: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Customer {
  @Prop()
  name: string;

  @Prop()
  lastName: string;

  @Prop()
  phone: string;

  @Prop()
  date: Date;

  @Prop()
  email: string;

  @Prop()
  address: string;

  @Prop()
  city: string;

  @Prop()
  zipCode: string;

  @Prop()
  state: string;

  @Prop()
  leadSource: string;

  @Prop()
  description: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  companyId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false, ref: 'User' })
  userId?: MongooseSchema.Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ companyId: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ userId: 1 });