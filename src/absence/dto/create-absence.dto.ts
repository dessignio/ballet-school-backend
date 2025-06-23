// ballet-school-backend/src/absence/dto/create-absence.dto.ts
// Add imports for validation if using class-validator
// import { IsString, IsUUID, IsOptional, IsNotEmpty, IsIn } from 'class-validator';
// import { AbsenceStatus } from '../absence.entity'; // if status was part of create

export class CreateAbsenceDto {
  // @IsUUID()
  studentId: string;

  // @IsString()
  // @IsNotEmpty()
  studentName: string;

  // @IsString()
  // @IsNotEmpty()
  classId: string;

  // @IsString()
  // @IsNotEmpty()
  className: string;

  // @IsString()
  // @IsNotEmpty()
  classDateTime: string; // e.g., "YYYY-MM-DD HH:mm" or just class time + today's date

  // @IsString()
  // @IsNotEmpty()
  reason: string;

  // @IsString()
  // @IsOptional()
  notes?: string;
}
