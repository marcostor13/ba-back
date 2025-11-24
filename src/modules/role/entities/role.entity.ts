import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types, Schema as MongooseSchema } from "mongoose";

export interface RoleDocument {
    name: string
    userId: Types.ObjectId
}

export interface GetRoleDocument extends RoleDocument {
    _id: Types.ObjectId
}


@Schema({ timestamps: true })
export class Role {

    @Prop()
    name: string

    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    userId: MongooseSchema.Types.ObjectId

    @Prop({ default: true })
    active: boolean

}

export const RoleSchema = SchemaFactory.createForClass(Role)