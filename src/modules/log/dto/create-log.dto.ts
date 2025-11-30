import {
  IsString,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsObject,
  IsNumber,
  IsBoolean,
  IsDate,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogType, LogSeverity } from '../schemas/log.schema';

export class CreateLogDto {
  @IsEnum(LogType)
  type: LogType;

  @IsEnum(LogSeverity)
  @IsOptional()
  severity?: LogSeverity;

  @IsString()
  @MaxLength(500)
  message: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsMongoId()
  @IsOptional()
  companyId?: string;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  stackTrace?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  endpoint?: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsNumber()
  @IsOptional()
  statusCode?: number;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  resolvedAt?: Date;

  @IsMongoId()
  @IsOptional()
  resolvedBy?: string;
}



