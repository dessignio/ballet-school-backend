// src/general-settings/dto/update-general-settings.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';
import { BusinessHourDto } from './business-hour.dto';

export class UpdateGeneralSettingsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  academyName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsOptional()
  @IsString()
  logoUrl?: string; // Will handle base64 string or URL

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHourDto)
  businessHours: BusinessHourDto[];
}
