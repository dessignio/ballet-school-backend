// src/admin-user/dto/bulk-update-admin-user-status.dto.ts
import { IsArray, ArrayNotEmpty, IsUUID, IsEnum } from 'class-validator';
import {
  AdminUserStatus,
  AdminUserStatusValues,
} from '../types/admin-user-status.type';

export class BulkUpdateAdminUserStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true, message: 'Each ID in ids must be a valid UUID' })
  ids: string[];

  @IsEnum(AdminUserStatusValues)
  status: AdminUserStatus;
}
