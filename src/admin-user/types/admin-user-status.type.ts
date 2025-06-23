// src/admin-user/types/admin-user-status.type.ts
export const AdminUserStatusValues = [
  'active',
  'inactive',
  'suspended',
] as const;
export type AdminUserStatus = (typeof AdminUserStatusValues)[number];
