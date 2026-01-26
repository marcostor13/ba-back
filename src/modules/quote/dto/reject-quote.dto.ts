import { IsString, IsNotEmpty, IsArray, IsOptional, IsMongoId } from 'class-validator';

export class RejectQuoteDto {
  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsMongoId()
  @IsOptional()
  rejectedBy?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaFiles?: string[];
}
