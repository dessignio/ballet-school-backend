// src/student/dto/update-student.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import {
  CreateStudentDto,
  EmergencyContactDto,
  AddressDto,
} from './create-student.dto';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  MaxLength,
  MinLength,
  Matches,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  Gender,
  ProgramName,
  DancerLevelName,
  StudentStatus,
} from '../student.entity';

// By extending PartialType<CreateStudentDto>, this class automatically inherits all properties
// from CreateStudentDto, makes them optional, and keeps all their validation decorators.
// We are explicitly re-declaring properties here to ensure they are recognized by TypeScript,
// which seems to be the pattern in other parts of this project.
export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, dots, and hyphens',
  })
  username?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid date string (YYYY-MM-DD).' },
  )
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'], {
    message: 'Invalid gender value.',
  })
  gender?: Gender;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid email is required.' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  program?: ProgramName | null;

  @IsOptional()
  @IsString()
  dancerLevel?: DancerLevelName | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enrolledClasses?: string[];

  @IsOptional()
  @IsUUID('4', {
    message: 'membershipPlanId must be a valid UUID if provided.',
  })
  membershipPlanId?: string | null;

  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'membershipStartDate must be a valid date string (YYYY-MM-DD) if provided.',
    },
  )
  membershipStartDate?: string | null;

  @IsOptional()
  @IsEnum(['Activo', 'Inactivo', 'Suspendido'], {
    message: 'Invalid status value.',
  })
  status?: StudentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  personalGoals?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Parent ID must be a valid UUID.' })
  parentId?: string | null;
}
