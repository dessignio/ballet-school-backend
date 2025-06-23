/* eslint-disable @typescript-eslint/no-unused-vars */
// src/student/dto/create-student.dto.ts
import {
  Gender,
  ProgramName,
  DancerLevelName,
  MembershipPlan,
  StudentStatus,
} from '../student.entity';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Definimos interfaces para los objetos anidados como parte del DTO
export class EmergencyContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
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

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo'])
  gender?: Gender;

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
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
  @IsString() // Assuming ProgramName is a string for now, adjust if it's a strict enum
  program?: ProgramName | null;

  @IsOptional()
  @IsString() // Assuming DancerLevelName is a string
  dancerLevel?: DancerLevelName | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enrolledClasses?: string[] = [];

  @IsEnum(['Basic', 'Basic Plus', 'Pro', 'Ultra', 'Complete'])
  membershipType: MembershipPlan;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;

  @IsOptional()
  @IsEnum(['Activo', 'Inactivo', 'Suspendido'])
  status?: StudentStatus = 'Activo';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  personalGoals?: string;
}
