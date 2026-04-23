import { IsOptional, IsString, IsEmail, IsDate, IsMongoId, IsNotEmpty, ValidateNested, IsBoolean, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CustomerAddressDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value).trim();
};

export class CreateCustomerDto {
  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  name?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  lastName?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  phone?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  date?: Date;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  address?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  city?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  zipCode?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  state?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  leadSource?: string;

  @Transform(({ value }) => toStringOrUndefined(value))
  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsOptional()
  companyId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  @IsOptional()
  addresses?: CustomerAddressDto[];
}
