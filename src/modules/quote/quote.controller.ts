import { Controller, Post, Body, ValidationPipe, Get, Param, Patch, Query } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateKitchenQuoteRequestDto } from './dto/create-kitchen-quote-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) { }

  @Post('kitchen')
  async createQuote(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    body: CreateKitchenQuoteRequestDto,
  ) {
    return this.quoteService.createKitchenQuote(body);
  }

  @Get()
  async findAll(@Query('category') category?: string) {
    return this.quoteService.findAll(category);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.quoteService.findById(id);
  }

  @Patch(':id')
  async updateById(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) body: UpdateQuoteDto,
  ) {
    return this.quoteService.updateById(id, body);
  }
}