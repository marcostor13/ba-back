import { Controller, Get, Param, NotFoundException, BadRequestException, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query('companyId') companyId?: string) {
    // El parámetro companyId se ignora porque los usuarios no están asociados a compañías
    // Los usuarios son globales del sistema
    return await this.usersService.findAll();
  }

  @Get('by-email/:email')
  async findOneByEmail(@Param('email') email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);
    }
    // No devolver la contraseña ni códigos de reset
    const { password, resetCodeHash, resetCodeExpiresAt, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Get(':id')
  async findOneById(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return user;
  }
}

