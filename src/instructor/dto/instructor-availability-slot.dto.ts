// src/instructor/dto/instructor-availability-slot.dto.ts
import {
  IsNotEmpty,
  IsString,
  Matches,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class InstructorAvailabilitySlotDto {
  // id: string; // Usually not needed in DTO if slots are managed as part of instructor JSON or have DB-generated IDs

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string; // "HH:mm"

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string; // "HH:mm"
}
