import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

