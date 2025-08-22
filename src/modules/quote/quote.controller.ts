import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { CreateKitchenQuoteDto } from './dto/create-quote.dto';
import { QuoteResult } from './types/quote.types';

@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) { }

  @Post('kitchen')
  createQuote(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createQuoteDto: CreateKitchenQuoteDto,
  ): QuoteResult {
    return this.quoteService.calculateKitchenQuote(createQuoteDto);
  }
}