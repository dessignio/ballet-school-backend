// src/general-settings/dto/address.dto.ts
import { IsString, MaxLength, IsOptional } from 'class-validator';

export class AddressDto {
  @IsString()
  @MaxLength(255)
  street: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode: string;
}
