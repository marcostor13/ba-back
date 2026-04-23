import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuoteService } from './quote.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';
import { ApproveQuoteDto } from './dto/approve-quote.dto';
import { SendQuoteDto } from './dto/send-quote.dto';
import { Quote, QuoteCategory, QuoteStatus } from './schemas/quote.schema';
import { RoleService } from '../role/role.service';
import { CustomerService } from '../customer/customer.service';
import { ProjectService } from '../project/project.service';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('quote')
@UseGuards(AuthGuard('jwt'))
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly roleService: RoleService,
    private readonly customerService: CustomerService,
    private readonly projectService: ProjectService,
  ) { }

  @Post()
  async create(@Body(validationPipe) body: CreateQuoteRequestDto, @Request() req): Promise<Quote> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot create quotes directly');
    }
    return this.quoteService.create(body);
  }

  @Get()
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async findAll(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('projectId') projectId?: string,
    @Query('category') category?: QuoteCategory,
    @Query('status') status?: QuoteStatus,
    @Query('userId') userId?: string,
  ): Promise<Quote[]> {
    const role = await this.roleService.findByUserId(req.user.userId);
    
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer) {
        return [];
      }
      return this.quoteService.findAll(companyId, projectId, category, status, userId, customer._id.toString());
    }

    return this.quoteService.findAll(companyId, projectId, category, status, userId);
  }

  @Get('project/:projectId')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async findByProject(@Param('projectId') projectId: string, @Request() req): Promise<Quote[]> {
    const role = await this.roleService.findByUserId(req.user.userId);
    
    if (role?.name === 'customer') {
      const project = await this.projectService.findById(projectId);
      if (!project) throw new NotFoundException('Project not found');
      
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || project.customerId.toString() !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.quoteService.findByProjectId(projectId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Request() req): Promise<Quote> {
    const quote = await this.quoteService.findById(id);
    
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      const quoteCustId = (quote.customerId as any)._id?.toString() || quote.customerId.toString();
      
      if (!customer || quoteCustId !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return quote;
  }

  @Get(':id/pdf-url')
  async getPdfUrl(@Param('id') id: string, @Request() req): Promise<{ pdfUrl: string }> {
    const quote = await this.quoteService.findById(id);
    const role = await this.roleService.findByUserId(req.user.userId);

    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      const quoteCustId = (quote.customerId as any)._id?.toString() || quote.customerId.toString();

      if (!customer || quoteCustId !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    const pdfUrl = await this.quoteService.getOrCreatePdfUrl(id);
    return { pdfUrl };
  }

  @Get('project/:projectId/versions')
  async findVersions(
    @Param('projectId') projectId: string,
    @Query('versionNumber') versionNumber: number,
    @Request() req,
  ): Promise<Quote[]> {
    const role = await this.roleService.findByUserId(req.user.userId);
    
    if (role?.name === 'customer') {
      const project = await this.projectService.findById(projectId);
      if (!project) throw new NotFoundException('Project not found');
      
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || project.customerId.toString() !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.quoteService.findVersions(projectId, versionNumber);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(validationPipe) body: UpdateQuoteDto,
    @Request() req,
  ): Promise<Quote> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot update quotes directly');
    }
    return this.quoteService.update(id, body);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body(validationPipe) body: ApproveQuoteDto,
    @Request() req,
  ): Promise<Quote> {
    const quote = await this.quoteService.findById(id);
    const role = await this.roleService.findByUserId(req.user.userId);
    
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      // quote.customerId es populated o string, findById hace populate
      const quoteCustId = (quote.customerId as any)._id?.toString() || quote.customerId.toString();
      
      if (!customer || quoteCustId !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.quoteService.approve(id, body);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body(validationPipe) body: RejectQuoteDto,
    @Request() req,
  ): Promise<Quote> {
    const quote = await this.quoteService.findById(id);
    const role = await this.roleService.findByUserId(req.user.userId);
    
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      const quoteCustId = (quote.customerId as any)._id?.toString() || quote.customerId.toString();
      
      if (!customer || quoteCustId !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return this.quoteService.reject(id, body);
  }

  @Post(':id/send')
  async send(
    @Param('id') id: string,
    @Body(validationPipe) body: SendQuoteDto,
    @Request() req,
  ): Promise<Quote> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot send quotes');
    }
    return this.quoteService.send(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req): Promise<Quote> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot delete quotes');
    }
    return this.quoteService.delete(id);
  }
}