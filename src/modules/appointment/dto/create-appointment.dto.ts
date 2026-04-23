import { IsString, IsOptional, IsMongoId, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '../schemas/appointment.schema';

export class CreateAppointmentDto {
  @IsMongoId()
  projectId: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @IsString()
  @IsOptional()
  notes?: string;
}
