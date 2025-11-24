import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

export interface IUser {
    _id?: Types.ObjectId;
    email: string;
    name: string;
    password?: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
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
            password: user.password,
            resetCodeHash: user.resetCodeHash,
            resetCodeExpiresAt: user.resetCodeExpiresAt
        };
    }

    async create(userData: IUser): Promise<IUser> {
        const createdUser = new this.userModel(userData);
        const savedUser = await createdUser.save();
        return {
            _id: savedUser._id,
            email: savedUser.email,
            name: savedUser.name,
        };
    }

    async deleteById(id: string | Types.ObjectId): Promise<void> {
        const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;
        await this.userModel.findByIdAndDelete(objectId).exec();
    }

    async updatePassword(userId: string | Types.ObjectId, hashedPassword: string): Promise<void> {
        const objectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        await this.userModel
            .findByIdAndUpdate(
                objectId,
                { password: hashedPassword, resetCodeHash: undefined, resetCodeExpiresAt: undefined },
                { new: true },
            )
            .exec();
    }

    async setPasswordResetCode(
        userId: string | Types.ObjectId,
        resetCodeHash: string,
        expiresAt: Date,
    ): Promise<void> {
        const objectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
        await this.userModel
            .findByIdAndUpdate(
                objectId,
                { resetCodeHash, resetCodeExpiresAt: expiresAt },
                { new: true },
            )
            .exec();
    }

}
