// src/attendance/types/attendance-status.type.ts
export const AttendanceStatusValues = [
  'Present',
  'Absent',
  'Late',
  'Excused',
] as const;
export type AttendanceStatus = (typeof AttendanceStatusValues)[number];
