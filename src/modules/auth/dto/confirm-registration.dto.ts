import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  estimatorId?: string;

  @IsOptional()
  @IsString()
  companyId?: string;
}
