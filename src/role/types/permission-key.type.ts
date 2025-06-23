// src/role/types/permission-key.type.ts

// IMPORTANT: This array MUST mirror the 'key' values from AVAILABLE_PERMISSIONS in your frontend constants.ts
// Add all your permission keys here.
export const PermissionKeyValues = [
  'manage_students',
  'view_students',
  'manage_instructors',
  'view_instructors',
  'manage_admin_users',
  'manage_programs',
  'manage_class_offerings',
  'manage_schedules',
  'manage_enrollments',
  'view_enrollments',
  'manage_waitlists',
  'manage_billing_settings',
  'view_financial_reports',
  'process_payments',
  'send_announcements',
  'manage_communication_templates',
  'view_all_reports',
  'manage_general_settings',
  'manage_roles_permissions',
] as const; // 'as const' makes it a tuple of string literals

export type PermissionKey = (typeof PermissionKeyValues)[number];
