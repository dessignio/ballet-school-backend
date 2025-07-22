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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsInt()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Min(0)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Max(6)
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNotEmpty()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string; // "HH:mm"

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNotEmpty()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string; // "HH:mm"
}
