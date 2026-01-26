import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import { RoleService, RoleLean } from '../role/role.service';

export interface IUser {
    _id?: Types.ObjectId;
    email: string;
    name: string;
    password?: string;
  resetCodeHash?: string;
  resetCodeExpiresAt?: Date;
  roles?: Array<{ name: string; active: boolean }>;
}

@Injectable()
export class UsersService {

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly roleService: RoleService,
    ) { }
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

    async findAll(): Promise<IUser[]> {
        const users = await this.userModel
            .find()
            .select('-password -resetCodeHash -resetCodeExpiresAt')
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        // Obtener todos los roles de los usuarios en una sola consulta para mayor eficiencia
        const userIds = users.map((user) => user._id as Types.ObjectId);
        const roles = await this.roleService.findByUserIds(userIds);
        const rolesByUserId = new Map<string, Array<{ name: string; active: boolean }>>();

        // Agrupar roles por userId
        roles.forEach((role: RoleLean) => {
            const userId = role.userId.toString();
            if (!rolesByUserId.has(userId)) {
                rolesByUserId.set(userId, []);
            }
            rolesByUserId.get(userId)!.push({
                name: role.name,
                active: role.active ?? true,
            });
        });

        // Mapear usuarios con sus roles
        return users.map((user) => ({
            _id: user._id,
            email: user.email,
            name: user.name,
            roles: rolesByUserId.get(user._id.toString()) || [],
        }));
    }

    async findById(id: string | Types.ObjectId): Promise<IUser | null> {
        const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;
        const user = await this.userModel.findById(objectId).select('-password -resetCodeHash -resetCodeExpiresAt').lean().exec();
        if (!user) {
            return null;
        }
        return {
            _id: user._id,
            email: user.email,
            name: user.name,
        };
    }

}
