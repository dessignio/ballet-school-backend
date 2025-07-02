/* eslint-disable @typescript-eslint/no-unused-vars */
// src/calendar-settings/dto/school-term.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class SchoolTermDto {
  // Allow temporary frontend IDs, but validate UUID if it exists
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
