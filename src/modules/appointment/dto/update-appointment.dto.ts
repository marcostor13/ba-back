import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType, AppointmentStatus } from '../schemas/appointment.schema';

export class UpdateAppointmentDto {
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  date?: Date;

  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;
}
