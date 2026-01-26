import { IsMongoId, IsOptional } from 'class-validator';

export class ApproveQuoteDto {
  @IsMongoId()
  @IsOptional()
  approvedBy?: string;
}
