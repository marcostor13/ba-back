import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { RoleService, RoleLean } from '../role/role.service';

export interface IUser {
    _id?: Types.ObjectId;
    email: string;
    name: string;
    password?: string;
    resetCodeHash?: string;
    resetCodeExpiresAt?: Date;
    verificationCodeHash?: string;
    verificationCodeExpiresAt?: Date;
    registrationData?: {
        name: string;
        password: string;
    };
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
            resetCodeExpiresAt: user.resetCodeExpiresAt,
            verificationCodeHash: user.verificationCodeHash,
            verificationCodeExpiresAt: user.verificationCodeExpiresAt,
            registrationData: user.registrationData
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

    async anonymizeById(id: string | Types.ObjectId): Promise<void> {
        const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;
        const anonymousEmail = `deleted_${objectId.toString()}@anonymous.local`;
        const anonymousName = 'Deleted User';
        const anonymousPassword = await bcrypt.hash(
            `anon_${objectId.toString()}_${Date.now()}`,
            10,
        );
        await this.userModel
            .findByIdAndUpdate(
                objectId,
                {
                    email: anonymousEmail,
                    name: anonymousName,
                    password: anonymousPassword,
                    resetCodeHash: undefined,
                    resetCodeExpiresAt: undefined,
                    verificationCodeHash: undefined,
                    verificationCodeExpiresAt: undefined,
                    registrationData: undefined,
                },
                { new: true },
            )
            .exec();
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

    async setVerificationCode(
        email: string,
        verificationCodeHash: string,
        expiresAt: Date,
        registrationData: { name: string; password: string },
    ): Promise<void> {
        // Usar upsert pero incluir los campos requeridos para que el documento sea válido
        await this.userModel
            .findOneAndUpdate(
                { email },
                {
                    email,
                    name: registrationData.name,
                    password: registrationData.password,
                    verificationCodeHash,
                    verificationCodeExpiresAt: expiresAt,
                    registrationData
                },
                { upsert: true, new: true, setDefaultsOnInsert: true },
            )
            .exec();
    }

    async clearVerificationCode(email: string): Promise<void> {
        await this.userModel
            .findOneAndUpdate(
                { email },
                {
                    verificationCodeHash: undefined,
                    verificationCodeExpiresAt: undefined,
                    registrationData: undefined
                },
                { new: true },
            )
            .exec();
    }

    async activateUserFromVerification(email: string): Promise<IUser> {
        const user = await this.userModel.findOne({ email });
        if (!user || !user.registrationData) {
            throw new Error('Usuario temporal no encontrado o datos de registro inválidos');
        }

        // Actualizar el documento eliminando los campos temporales y manteniendo los datos permanentes
        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                user._id,
                {
                    verificationCodeHash: undefined,
                    verificationCodeExpiresAt: undefined,
                    registrationData: undefined,
                },
                { new: true },
            )
            .exec();

        if (!updatedUser) {
            throw new Error('Error al activar el usuario');
        }

        return {
            _id: updatedUser._id,
            email: updatedUser.email,
            name: updatedUser.name,
        };
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
