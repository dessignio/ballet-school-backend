/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/role/dto/create-role.dto.ts
import {
  IsString,
  IsArray,
  IsEnum,
  IsNotEmpty,
  ArrayNotEmpty,
  MaxLength,
  IsOptional,
} from 'class-validator';
import {
  PermissionKey,
  PermissionKeyValues,
} from '../types/permission-key.type';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one permission must be selected.' })
  @IsEnum(PermissionKeyValues, {
    each: true,
    message: `Each permission must be a valid key. Valid keys are: ${PermissionKeyValues.join(', ')}`,
  })
  permissions: PermissionKey[];
}
