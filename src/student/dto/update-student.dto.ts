/* eslint-disable @typescript-eslint/no-unused-vars */
// src/student/dto/update-student.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentDto } from './create-student.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  Matches,
  IsDateString,
  IsEnum,
  IsArray,
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

// ================= ¡AQUÍ ESTÁ LA CORRECCIÓN! =================
// Convertimos EmergencyContact y Address en CLASES para que puedan ser usadas por los decoradores.

class EmergencyContactDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  relationship: string;
}

class AddressDto {
  @IsString()
  @IsOptional()
  street: string;

  @IsString()
  @IsOptional()
  city: string;

  @IsString()
  @IsOptional()
  state: string;

  @IsString()
  @IsOptional()
  zipCode: string;
}
// ==========================================================

export class UpdateStudentDto extends PartialType(CreateStudentDto) {
  // Las propiedades son heredadas de CreateStudentDto como opcionales.
  // Sobrescribimos las que necesitan validación anidada.

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto) // <-- Ahora usamos la CLASE EmergencyContactDto
  emergencyContact?: EmergencyContactDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto) // <-- Ahora usamos la CLASE AddressDto
  address?: AddressDto;

  // El resto de tus propiedades heredadas funcionan como antes.
  // No necesitas redeclararlas a menos que quieras cambiar las reglas de validación.
}
