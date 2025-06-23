// src/attendance/dto/index.ts
export * from './create-attendance.dto';
export * from './bulk-mark-attendance.dto';
// UpdateAttendanceDto is not explicitly created as POST will handle upsert logic.
// If a separate PATCH endpoint for updates was needed, it would be here.
