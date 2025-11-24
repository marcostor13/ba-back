import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentInstallmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0.01)
  @Max(100)
  percentage: number;

  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;
}

export class CreateInvoiceDto {
  @IsMongoId()
  @IsNotEmpty()
  quoteId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInstallmentDto)
  paymentPlan: PaymentInstallmentDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

