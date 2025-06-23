// src/attendance/dto/create-attendance.dto.ts
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import {
  AttendanceStatus,
  AttendanceStatusValues,
} from '../types/attendance-status.type';

export class CreateAttendanceDto {
  @IsUUID('4')
  @IsNotEmpty()
  studentId: string;

  @IsUUID('4')
  @IsNotEmpty()
  classOfferingId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, {
    // Changed \\d to \d
    message: 'classDateTime must be in YYYY-MM-DD HH:mm format',
  })
  classDateTime: string;

  @IsEnum(AttendanceStatusValues)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID('4')
  absenceId?: string;
}
