import { IsOptional, IsString, IsEmail, IsDate, IsMongoId, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
}
