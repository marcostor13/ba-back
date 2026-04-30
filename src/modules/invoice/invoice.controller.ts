import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleService } from '../role/role.service';

@Controller('invoice')
// @UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly roleService: RoleService,
  ) {}

  @Post()
  create(@Body() createInvoiceDto: CreateInvoiceDto, @Request() req) {
    // TODO: Revertir a req.user.userId cuando el frontend envíe el token
    const userId = req.user?.userId || '507f1f77bcf86cd799439011'; 
    return this.invoiceService.create(createInvoiceDto, userId);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('projectId') projectId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.invoiceService.findAll(companyId, projectId, customerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const role = await this.roleService.findByUserId(req.user?.userId);
    if (role?.name === 'customer' || role?.name === 'estimator') {
      throw new ForbiddenException('Only admins can delete invoices');
    }
    return this.invoiceService.delete(id);
  }
}

