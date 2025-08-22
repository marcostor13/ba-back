import { PartialType } from '@nestjs/mapped-types';
import { CreateKitchenQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(CreateKitchenQuoteDto) { }
