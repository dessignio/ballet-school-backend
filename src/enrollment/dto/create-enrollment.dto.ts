// src/enrollment/dto/create-enrollment.dto.ts
import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import {
  EnrollmentStatus,
  EnrollmentStatusValues,
} from '../types/enrollment-status.type';

export class CreateEnrollmentDto {
  @IsUUID('4', { message: 'studentId must be a valid UUID.' })
  @IsNotEmpty({ message: 'studentId is required.' })
  studentId: string;

  @IsUUID('4', { message: 'classOfferingId must be a valid UUID.' })
  @IsNotEmpty({ message: 'classOfferingId is required.' })
  classOfferingId: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'enrollmentDate must be a valid ISO 8601 date string.' },
  )
  enrollmentDate?: string; // Should be set by client or defaulted in service

  @IsEnum(EnrollmentStatusValues, {
    message: 'status must be a valid EnrollmentStatus.',
  })
  @IsNotEmpty({ message: 'status is required.' })
  status: EnrollmentStatus;

  @IsOptional()
  @IsInt({ message: 'waitlistPosition must be an integer.' })
  @Min(1, { message: 'waitlistPosition must be at least 1.' })
  waitlistPosition?: number;
}
