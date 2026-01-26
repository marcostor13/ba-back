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
} from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { RejectQuoteDto } from './dto/reject-quote.dto';
import { ApproveQuoteDto } from './dto/approve-quote.dto';
import { SendQuoteDto } from './dto/send-quote.dto';
import { Quote, QuoteCategory, QuoteStatus } from './schemas/quote.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) { }

  @Post()
  async create(@Body(validationPipe) body: CreateQuoteRequestDto): Promise<Quote> {
    return this.quoteService.create(body);
  }

  @Get()
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findAll(
    @Query('companyId') companyId?: string,
    @Query('projectId') projectId?: string,
    @Query('category') category?: QuoteCategory,
    @Query('status') status?: QuoteStatus,
    @Query('userId') userId?: string,
  ): Promise<Quote[]> {
    return this.quoteService.findAll(companyId, projectId, category, status, userId);
  }

  @Get('project/:projectId')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findByProject(@Param('projectId') projectId: string): Promise<Quote[]> {
    return this.quoteService.findByProjectId(projectId);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<Quote> {
    return this.quoteService.findById(id);
  }

  @Get('project/:projectId/versions')
  async findVersions(
    @Param('projectId') projectId: string,
    @Query('versionNumber') versionNumber?: number,
  ): Promise<Quote[]> {
    return this.quoteService.findVersions(projectId, versionNumber);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(validationPipe) body: UpdateQuoteDto,
  ): Promise<Quote> {
    return this.quoteService.update(id, body);
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body(validationPipe) body: ApproveQuoteDto,
  ): Promise<Quote> {
    return this.quoteService.approve(id, body);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body(validationPipe) body: RejectQuoteDto,
  ): Promise<Quote> {
    return this.quoteService.reject(id, body);
  }

  @Post(':id/send')
  async send(
    @Param('id') id: string,
    @Body(validationPipe) body: SendQuoteDto,
  ): Promise<Quote> {
    return this.quoteService.send(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Quote> {
    return this.quoteService.delete(id);
  }
}