// src/admin-user/dto/create-admin-user.dto.ts
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import {
  AdminUserStatus,
  AdminUserStatusValues,
} from '../types/admin-user-status.type';

export class CreateAdminUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(100)
  password: string;

  @IsUUID('4')
  @IsNotEmpty()
  roleId: string;

  @IsOptional()
  @IsEnum(AdminUserStatusValues)
  status?: AdminUserStatus = 'active';
}
