/* eslint-disable @typescript-eslint/no-unused-vars */
// src/calendar-settings/dto/studio-room.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Matches,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class StudioRoomDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}){1,2}$/, {
    message: 'Color must be a valid hex code (e.g., #RRGGBB or #RGB).',
  })
  color?: string;
}
