// src/admin-user/dto/update-admin-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminUserDto } from './create-admin-user.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
  IsUUID,
  IsEnum,
} from 'class-validator';
import {
  AdminUserStatus,
  AdminUserStatusValues,
} from '../types/admin-user-status.type';

export class UpdateAdminUserDto extends PartialType(CreateAdminUserDto) {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsUUID('4')
  roleId?: string;

  @IsOptional()
  @IsEnum(AdminUserStatusValues)
  status?: AdminUserStatus;
}
