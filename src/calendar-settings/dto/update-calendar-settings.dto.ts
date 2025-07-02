// src/calendar-settings/dto/update-calendar-settings.dto.ts
import {
  IsInt,
  IsString,
  IsArray,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SchoolTermDto } from './school-term.dto';
import { StudioRoomDto } from './studio-room.dto';

export class UpdateCalendarSettingsDto {
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  defaultClassDuration: number;

  @IsString()
  @IsNotEmpty()
  studioTimezone: string;

  @IsInt()
  @Min(0)
  @Max(1)
  @IsNotEmpty()
  weekStartDay: 0 | 1;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SchoolTermDto)
  terms: SchoolTermDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudioRoomDto)
  rooms: StudioRoomDto[];

  // Properties like id and updatedAt are managed by the backend and not part of the DTO.
}
