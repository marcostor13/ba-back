import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmRegistrationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
