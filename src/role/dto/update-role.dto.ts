// src/role/dto/update-role.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
  IsEnum,
  ArrayNotEmpty,
} from 'class-validator';
import {
  PermissionKey,
  PermissionKeyValues,
} from '../types/permission-key.type';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({
    message:
      'At least one permission must be selected if permissions are provided for update.',
  })
  @IsEnum(PermissionKeyValues, {
    each: true,
    message: `Each permission must be a valid key. Valid keys are: ${PermissionKeyValues.join(', ')}`,
  })
  permissions?: PermissionKey[];
}
