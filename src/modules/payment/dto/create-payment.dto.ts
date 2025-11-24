import { 
  IsMongoId, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  Min, 
  IsString, 
  IsEnum 
} from 'class-validator';
import { PaymentMethod } from '../schemas/payment.schema';

export class CreatePaymentIntentDto {
  @IsMongoId()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @Min(0.5) // Stripe mínimo aprox 50 cents
  amount: number;

  @IsNumber()
  @IsOptional()
  installmentIndex?: number;
}

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
  
  @IsMongoId()
  @IsNotEmpty()
  invoiceId: string;
  
  @IsNumber()
  @IsOptional()
  installmentIndex?: number;
}

export class RecordManualPaymentDto {
  @IsMongoId()
  @IsNotEmpty()
  invoiceId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;
  
  @IsString()
  @IsOptional()
  notes?: string;
  
  @IsNumber()
  @IsOptional()
  installmentIndex?: number;
}
