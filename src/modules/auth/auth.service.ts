import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { IUser, UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { RoleService } from '../role/role.service';
import { MailService } from '../mail/mail.service';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
@Injectable()
export class AuthService {
    private readonly passwordResetTTLMinutes = 15;

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private roleService: RoleService,
        private readonly mailService: MailService,
    ) { }

    // Método para registrar un nuevo usuario
    async register(registerDto: RegisterDto): Promise<any> {
        const { email, password, name } = registerDto;
        const userExists = await this.usersService.findOne(email);
        if (userExists) {
            throw new BadRequestException('The user already exists');
        }
        // Hashea la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await this.usersService.create({ email, password: hashedPassword, name });
        if (!newUser._id) {
            throw new BadRequestException('Error creating user');
        }
        const role = await this.roleService.create({ name: 'customer', userId: newUser._id });

        const payload = { email: newUser.email, sub: newUser._id };
        // Retorna un JWT junto con la información básica del usuario
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: newUser._id, email: newUser.email, name: newUser.name, role: role.name },
        };
    }

    // Verifica que el usuario exista y que la contraseña sea correcta
    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && await bcrypt.compare(password, user.password)) {
            // Excluye la contraseña del resultado
            const { password, ...result } = user;
            return result;
        }
        throw new UnauthorizedException('Invalid credentials');
    }

    // Genera el token JWT con el payload deseado //y valida el password
    async login(userData: IUser) {
        if (!userData.email || !userData.password) {
            throw new BadRequestException('Invalid credentials');
        }

        const issetUser = await this.validateUser(userData.email, userData.password);
        if (!issetUser) {
            throw new BadRequestException('Invalid credentials');
        }
        const user = await this.usersService.findOne(userData.email);
        if (!user || !user._id) {
            throw new BadRequestException('Invalid credentials');
        }
        const role = await this.roleService.findByUserId(user._id.toString());
        if (!role) {
            throw new BadRequestException('Role not found');
        }
        const payload = { email: user.email, sub: user._id, };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user._id, email: user.email, name: user.name, role: role.name },
        };
    }

    async loginWithGoogle(userData: IUser) {
        const user = await this.usersService.findOne(userData.email);
        if (!user || !user._id) {
            throw new BadRequestException('The user does not exist');
        }
        const role = await this.roleService.findByUserId(user._id.toString());
        if (!role) {
            throw new BadRequestException('Role not found');
        }
        const payload = { email: user.email, sub: user._id, };
        return {
            access_token: this.jwtService.sign(payload),
            user: { id: user._id, email: user.email, name: user.name, role: role.name },
        }
    }

    refreshToken(userData: IUser) {
        const payload = { email: userData.email, sub: userData._id, };
        return {
            access_token: this.jwtService.sign(payload),
        }
    }

    async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto) {
        const email = requestPasswordResetDto.email.trim().toLowerCase();
        const user = await this.usersService.findOne(email);
        if (!user || !user._id) {
            return { message: 'Si el correo existe, se enviará un código de verificación' };
        }

        const code = this.generateResetCode();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(
            Date.now() + this.passwordResetTTLMinutes * 60 * 1000,
        );
        await this.usersService.setPasswordResetCode(user._id, codeHash, expiresAt);
        await this.mailService.sendPasswordResetCode({
            to: email,
            name: user.name,
            code,
            expiresInMinutes: this.passwordResetTTLMinutes,
        });

        return { message: 'Código enviado al correo registrado' };
    }

    async confirmPasswordReset(confirmPasswordResetDto: ConfirmPasswordResetDto) {
        const email = confirmPasswordResetDto.email.trim().toLowerCase();
        const user = await this.usersService.findOne(email);
        if (!user || !user._id || !user.resetCodeHash || !user.resetCodeExpiresAt) {
            throw new BadRequestException('Código inválido o expirado');
        }

        if (user.resetCodeExpiresAt.getTime() < Date.now()) {
            throw new BadRequestException('El código ha expirado');
        }

        const isValidCode = await bcrypt.compare(
            confirmPasswordResetDto.code,
            user.resetCodeHash,
        );

        if (!isValidCode) {
            throw new BadRequestException('Código inválido');
        }

        if (!confirmPasswordResetDto.newPassword || confirmPasswordResetDto.newPassword.length < 6) {
            throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
        }

        const hashedPassword = await bcrypt.hash(confirmPasswordResetDto.newPassword, 10);
        await this.usersService.updatePassword(user._id, hashedPassword);

        return { message: 'Contraseña actualizada correctamente' };
    }

    private generateResetCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}