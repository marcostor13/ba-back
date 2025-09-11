import { IsOptional, IsString, IsObject } from 'class-validator';

export class UpdateQuoteDto {
    @IsString()
    @IsOptional()
    category?: string;

    @IsOptional()
    @IsObject()
    data?: Record<string, unknown>;
}
