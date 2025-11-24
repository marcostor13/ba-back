import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsMongoId,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuoteCategory, QuoteStatus } from '../schemas/quote.schema';
import {
  KitchenInformation,
  BathroomInformation,
  BasementInformation,
  AdditionalWorkInformation,
} from '../types/form-information.types';

class MaterialItemDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}

class MaterialsDto {
  @IsString()
  @IsOptional()
  file?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MaterialItemDto)
  items?: MaterialItemDto[];
}

export class CreateQuoteRequestDto {
  @IsMongoId()
  @IsNotEmpty()
  customerId: string;

  @IsMongoId()
  @IsNotEmpty()
  companyId: string;

  @IsMongoId()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  experience: string;

  @IsEnum(QuoteCategory)
  @IsNotEmpty()
  category: QuoteCategory;

  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  versionNumber: number;

  @IsObject()
  @IsOptional()
  kitchenInformation?: KitchenInformation;

  @IsObject()
  @IsOptional()
  bathroomInformation?: BathroomInformation;

  @IsObject()
  @IsOptional()
  basementInformation?: BasementInformation;

  @IsObject()
  @IsOptional()
  additionalWorkInformation?: AdditionalWorkInformation;

  @IsNumber()
  @IsNotEmpty()
  totalPrice: number;

  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countertopsFiles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  backsplashFiles?: string[];

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => MaterialsDto)
  materials?: MaterialsDto;
}

