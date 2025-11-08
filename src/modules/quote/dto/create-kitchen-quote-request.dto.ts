import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateKitchenQuoteDto } from './create-quote.dto';

export class CreateKitchenQuoteRequestDto {
    @IsObject()
    @IsNotEmpty()
    customer: Record<string, unknown>;

    @IsObject()
    @IsNotEmpty()
    company: Record<string, unknown>;

    @ValidateNested()
    @IsOptional()
    @Type(() => CreateKitchenQuoteDto)
    kitchenInformation?: CreateKitchenQuoteDto;

    @IsOptional()
    materials?: unknown;

    @IsString()
    experience: string;

    @IsNumber()
    @IsOptional()
    totalPrice?: number;

    @ValidateNested()
    @IsOptional()
    @Type(() => CreateKitchenQuoteDto)
    formData?: CreateKitchenQuoteDto;
}


