import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { IUser, UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { RoleService } from '../role/role.service';
@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private roleService: RoleService
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
        const role = await this.roleService.create({ name: 'user', userId: newUser._id });

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
}