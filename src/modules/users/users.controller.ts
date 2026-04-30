import { Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException, BadRequestException, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RoleService } from '../role/role.service';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roleService: RoleService,
  ) {}

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

  @Post()
  async createUser(@Body() body: { name: string; email: string; role: string; password?: string }) {
    if (!body.name || !body.email || !body.role) {
      throw new BadRequestException('name, email and role are required');
    }
    const existing = await this.usersService.findOne(body.email.trim().toLowerCase());
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }
    const tempPassword = body.password || Math.random().toString(36).slice(-10) + 'A1!';
    const newUser = await this.usersService.createByAdmin({
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      password: tempPassword,
    });
    if (!newUser._id) {
      throw new BadRequestException('Error creating user');
    }
    await this.roleService.create({ name: body.role, userId: newUser._id });
    return { ...newUser, tempPassword };
  }

  @Patch(':id')
  async updateProfile(@Param('id') id: string, @Body() body: { name?: string; email?: string }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }
    const updated = await this.usersService.updateProfile(id, body);
    if (!updated) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return updated;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() body: { newPassword: string },
    @Request() req: { user: { userId: string } },
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    if (!body.newPassword || body.newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.changePasswordPlain(id, body.newPassword);
    return { message: 'Password updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.deleteById(id);
    return { message: 'User deleted successfully' };
  }
}

