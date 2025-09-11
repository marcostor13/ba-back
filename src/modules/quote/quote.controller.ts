import { Controller, Post, Body, ValidationPipe, Get, Param, Patch, Query } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateKitchenQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) { }

  @Post('kitchen')
  async createQuote(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createQuoteDto: CreateKitchenQuoteDto,
  ) {
    return this.quoteService.createKitchenQuote(createQuoteDto);
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