// src/role/types/permission-key.type.ts
// IMPORTANT: This array MUST mirror the 'key' values from AVAILABLE_PERMISSIONS in your frontend constants.ts
// Add all your permission keys here.
export const PermissionKeyValues = [
  // Student Management
  'view_students',
  'manage_students',
  // Instructor Management
  'view_instructors',
  'manage_instructors',
  // Class Management
  'manage_programs',
  'manage_class_offerings',
  'manage_schedules',
  // Enrollment Management
  'view_enrollments',
  'manage_enrollments',
  'manage_waitlists',
  'view_absences',
  'manage_absences',
  'mark_attendance',
  // Billing & Payments
  'manage_membership_plans',
  'manage_billing_settings',
  'view_financial_reports',
  'process_payments',
  'manage_invoices',
  // Communications
  'send_announcements',
  'manage_communication_templates',
  // Reports
  'view_all_reports',
  // Settings
  'manage_general_settings',
  'manage_calendar_settings',
  'manage_roles_permissions',
  'manage_admin_users',
] as const; // 'as const' makes it a tuple of string literals

export type PermissionKey = (typeof PermissionKeyValues)[number];
