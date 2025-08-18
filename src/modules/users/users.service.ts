import { Injectable, Type } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

export interface IUser {
    _id?: Types.ObjectId;
    email: string;
    name: string;
    password?: string;
}

@Injectable()
export class UsersService {

    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }
    async findOne(email: string): Promise<IUser | null> {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            return null;
        }
        return {
            _id: user._id,
            email: user.email,
            name: user.name,
            password: user.password
        };
    }

    async create(userData: IUser): Promise<IUser> {
        const createdUser = new this.userModel(userData);
        const savedUser = await createdUser.save();
        return {
            email: savedUser.email,
            name: savedUser.name,
        };
    }

}
