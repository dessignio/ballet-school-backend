// src/role/types/permission-key.type.ts
// IMPORTANT: This array MUST mirror the 'key' values from AVAILABLE_PERMISSIONS in your frontend constants.ts
// This is the single source of truth for backend validation.
export const PermissionKeyValues = [
  // Dashboard
  'view_dashboard',
  'view_dashboard_financials',
  // User Management
  'view_students',
  'manage_students',
  'view_instructors',
  'manage_instructors',
  // Class & Program Management
  'manage_programs',
  'manage_class_offerings',
  'manage_schedules',
  // Enrollment & Attendance
  'view_enrollments',
  'manage_enrollments',
  'manage_waitlists',
  'view_absences',
  'manage_absences',
  'mark_attendance',
  // Billing & Payments
  'process_payments',
  'manage_invoices',
  'manage_subscriptions',
  // Communications
  'send_announcements',
  'manage_communication_templates',
  // Reports
  'view_all_reports',
  'view_student_reports',
  'view_attendance_reports',
  'view_enrollment_reports',
  'view_financial_reports',
  'view_membership_reports',
  // Settings
  'manage_general_settings',
  'manage_calendar_settings',
  'manage_membership_plans',
  'manage_roles_permissions',
  'manage_admin_users',
] as const;

export type PermissionKey = (typeof PermissionKeyValues)[number];
