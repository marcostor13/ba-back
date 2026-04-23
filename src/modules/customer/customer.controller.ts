import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ValidationPipe, UseGuards, Request, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthGuard } from '@nestjs/passport';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { RoleService } from '../role/role.service';

@Controller('customer')
@UseGuards(AuthGuard('jwt'))
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly roleService: RoleService,
  ) { }

  @Post()
  async create(@Body(new ValidationPipe({ transform: true, whitelist: true })) createCustomerDto: CreateCustomerDto, @Request() req) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Access denied');
    }
    return this.customerService.create(createCustomerDto);
  }

  @Get('me')
  async findMe(@Request() req: { user: { userId: string } }) {
    const customer = await this.customerService.findByUserId(req.user.userId);
    if (!customer) {
      throw new NotFoundException('Customer profile not found');
    }
    return customer;
  }

  @Patch('me')
  async updateMe(
    @Request() req: { user: { userId: string } },
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customerService.findByUserId(req.user.userId);
    if (!customer || !customer._id) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.customerService.update(customer._id.toString(), updateCustomerDto);
  }

  @Get()
  async findAll(@Query('companyId') companyId?: string, @Request() req?) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      // El perfil "My projects" usa GET /customer?companyId=... para resolver el customerId.
      // Solo devolvemos el propio registro (filtrado por compañía si aplica), nunca el listado completo.
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer) {
        return [];
      }
      if (companyId) {
        if (!Types.ObjectId.isValid(companyId)) {
          throw new BadRequestException('Invalid companyId format');
        }
        if (customer.companyId?.toString() !== companyId) {
          return [];
        }
      }
      return [customer];
    }
    return this.customerService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || customer._id.toString() !== id) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body(new ValidationPipe({ transform: true, whitelist: true })) updateCustomerDto: UpdateCustomerDto, @Request() req) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || customer._id.toString() !== id) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.customerService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Access denied');
    }
    return this.customerService.remove(id);
  }
}
