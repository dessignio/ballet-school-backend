// ballet-school-backend/src/scheduled-class-slot/dto/create-scheduled-class-slot.dto.ts

// Add imports for validation if using class-validator, e.g.:
// import { IsInt, Min, Max, Matches, IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateScheduledClassSlotDto {
  // @IsInt()
  // @Min(0) // Sunday
  // @Max(6) // Saturday
  // @IsNotEmpty()
  dayOfWeek: number;

  // @IsString()
  // @Matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, { message: 'startTime must be in HH:mm or HH:mm:ss format' })
  // @IsNotEmpty()
  startTime: string; // "HH:mm" or "HH:mm:ss"

  // @IsString()
  // @Matches(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/, { message: 'endTime must be in HH:mm or HH:mm:ss format' })
  // @IsNotEmpty()
  endTime: string; // "HH:mm" or "HH:mm:ss"

  // @IsString()
  // @IsOptional()
  room?: string;

  // @IsUUID() // Add if ID is expected and should be validated when present
  // @IsOptional()
  id?: string; // ID is optional, present if updating an existing slot, absent for new slots
}
