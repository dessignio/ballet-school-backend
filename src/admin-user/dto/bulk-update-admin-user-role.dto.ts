// src/admin-user/dto/bulk-update-admin-user-role.dto.ts
import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class BulkUpdateAdminUserRoleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true, message: 'Each ID in ids must be a valid UUID' })
  ids: string[];

  @IsUUID('4')
  roleId: string;
}
