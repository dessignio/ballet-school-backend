// src/enrollment/dto/update-enrollment.dto.ts
import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import {
  EnrollmentStatus,
  EnrollmentStatusValues,
} from '../types/enrollment-status.type';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(EnrollmentStatusValues, {
    message: 'status must be a valid EnrollmentStatus.',
  })
  status?: EnrollmentStatus;

  @IsOptional()
  @IsInt({ message: 'waitlistPosition must be an integer.' })
  @Min(1, { message: 'waitlistPosition must be at least 1.' })
  waitlistPosition?: number | null; // Allow null to remove from waitlist explicitly
}
