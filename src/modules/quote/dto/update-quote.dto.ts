import {
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  IsMongoId,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNotEmpty,
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

export class UpdateQuoteDto {
  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @IsMongoId()
  @IsOptional()
  companyId?: string;

  @IsMongoId()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsEnum(QuoteCategory)
  @IsOptional()
  category?: QuoteCategory;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsNumber()
  @IsOptional()
  versionNumber?: number;

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
  @IsOptional()
  totalPrice?: number;

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
