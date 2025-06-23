// src/attendance/dto/bulk-mark-attendance.dto.ts
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class BulkMarkAttendanceDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  records: CreateAttendanceDto[];
}
