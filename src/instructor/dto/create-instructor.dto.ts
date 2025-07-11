// src/instructor/dto/create-instructor.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InstructorAvailabilitySlotDto } from './instructor-availability-slot.dto';
import { ProgramName } from '../types/program-name.type';

export class CreateInstructorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  // Add URL validation if desired, e.g., @IsUrl()
  profilePictureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true, message: 'Each specialization must be a string.' })
  specializations: ProgramName[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructorAvailabilitySlotDto)
  availability?: InstructorAvailabilitySlotDto[];
}
