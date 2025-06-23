// ballet-school-backend/src/absence/dto/update-absence.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAbsenceDto } from './create-absence.dto';
import { AbsenceStatus } from '../absence.entity';
// Add imports for validation if using class-validator
// import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAbsenceDto extends PartialType(CreateAbsenceDto) {
  // @IsString()
  // @IsOptional()
  // @IsIn(['Notificada', 'Justificada', 'No Justificada'])
  status?: AbsenceStatus;
}
