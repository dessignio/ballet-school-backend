// src/enrollment/types/enrollment-status.type.ts
export const EnrollmentStatusValues = [
  'Enrolled',
  'Waitlisted',
  'Dropped',
] as const;
export type EnrollmentStatus = (typeof EnrollmentStatusValues)[number];
