// ballet-school-backend/src/absence/dto/create-absence.dto.ts
import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  IsISO8601,
} from 'class-validator';

export class CreateAbsenceDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsNotEmpty()
  classId: string;

  @IsString()
  @IsNotEmpty()
  className: string;

  @IsISO8601()
  @IsNotEmpty()
  classDateTime: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
