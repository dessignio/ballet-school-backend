// src/attendance/dto/create-attendance.dto.ts
import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsISO8601,
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

  @IsISO8601()
  @IsNotEmpty()
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
