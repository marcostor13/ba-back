import { IsString, IsOptional, IsMongoId, IsEnum, IsObject, IsArray } from 'class-validator';
import { NotificationType } from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsMongoId()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsObject()
  payload: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  channels?: ('email' | 'sms' | 'in_app')[];
}
