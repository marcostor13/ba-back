import { IsMongoId, IsOptional } from 'class-validator';

export class SendQuoteDto {
  @IsMongoId()
  @IsOptional()
  sentBy?: string;
}
