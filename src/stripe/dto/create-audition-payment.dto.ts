/* eslint-disable @typescript-eslint/no-unused-vars */
import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAuditionPaymentDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
