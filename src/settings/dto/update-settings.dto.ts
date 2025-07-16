/* eslint-disable @typescript-eslint/no-unused-vars */
// backend/settings/dto/update-settings.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateStripeSettingsDto {
  @IsString()
  @IsOptional()
  publicKey?: string;

  @IsString()
  @IsOptional()
  enrollmentProductId?: string;

  @IsString()
  @IsOptional()
  enrollmentPriceId?: string;

  @IsString()
  @IsOptional()
  auditionProductId?: string;

  @IsString()
  @IsOptional()
  auditionPriceId?: string;
}
