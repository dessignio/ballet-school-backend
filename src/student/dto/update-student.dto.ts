
// src/student/dto/update-student.dto.ts
import { PartialType } from '@nestjs/mapped-types';
// Import the DTOs from create-student.dto.ts directly
import { CreateStudentDto, EmergencyContactDto, AddressDto } from './create-student.dto';
import { IsOptional, IsString, MinLength, MaxLength, IsEmail, Matches, IsDateString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, ProgramName, DancerLevelName, MembershipPlan, StudentStatus } from '../student.entity'; // Assuming these types are correctly defined


export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
  })
  username?: string;

  // Explicitly add other fields from CreateStudentDto that might be updated
  // and ensure their types and validation decorators are correctly applied for partial updates.
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(['Masculino', 'Femenino', 'Otro', 'Prefiero no decirlo']) gender?: Gender;
  @IsOptional() @IsString() profilePictureUrl?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;

  // Use the original DTOs for nested objects. PartialType makes 'emergencyContact' and 'address'
  // themselves optional. If provided in an update, they must be complete objects.
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto) 
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
  
  @IsOptional() @IsString() program?: ProgramName | null;
  @IsOptional() @IsString() dancerLevel?: DancerLevelName | null;
  
  @IsOptional() @IsArray() @IsString({ each: true }) enrolledClasses?: string[];
  @IsOptional() @IsEnum(['Basic', 'Basic Plus', 'Pro', 'Ultra', 'Complete']) membershipType?: MembershipPlan;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() renewalDate?: string;
  @IsOptional() @IsEnum(['Activo', 'Inactivo', 'Suspendido']) status?: StudentStatus;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() personalGoals?: string;
}
