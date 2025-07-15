// src/student/dto/create-student.dto.ts
import {
  Gender,
  ProgramName,
  DancerLevelName,
  StudentStatus,
} from '../student.entity'; // Adjusted path assuming student.entity defines these
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
  IsNotEmpty,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship: string;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode: string;
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, dots, and hyphens',
  })
  username?: string;

  @IsNotEmpty({ message: 'Date of birth is required.' })
  @IsDateString(
    {},
    { message: 'Date of birth must be a valid date string (YYYY-MM-DD).' },
  )
  dateOfBirth: string;

  @IsOptional()
  @IsEnum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'], {
    message: 'Invalid gender value.',
  })
  gender?: Gender;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string; // Removed MaxLength to allow for base64 strings

  @IsEmail({}, { message: 'A valid email is required.' })
  @MaxLength(255)
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required for new students.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100)
  password: string;

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
  enrolledClasses?: string[] = []; // Default to empty array

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

  // membershipType is derived by backend
  // membershipPlanName is derived by backend
  // membershipRenewalDate is derived by backend

  @IsOptional()
  @IsEnum(['Activo', 'Inactivo', 'Suspendido'], {
    message: 'Invalid status value.',
  })
  status?: StudentStatus = 'Activo';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  personalGoals?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Parent ID must be a valid UUID.' })
  parentId?: string | null;

  @IsUUID('4', { message: 'Studio ID must be a valid UUID.' })
  studioId: string;
}
