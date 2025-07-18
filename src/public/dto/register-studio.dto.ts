import { IsString, IsEmail, MinLength } from 'class-validator';

export class RegisterStudioDto {
  @IsString()
  directorName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsString()
  studioName: string;

  @IsString()
  planId: string;

  @IsString()
  billingCycle: 'monthly' | 'annual';

  @IsString()
  paymentMethodId: string;
}
