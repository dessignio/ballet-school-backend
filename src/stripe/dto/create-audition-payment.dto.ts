import { IsString, IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateAuditionPaymentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200) // First + Last name
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
