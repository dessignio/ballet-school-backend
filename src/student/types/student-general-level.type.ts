// src/student/types/student-general-level.type.ts
export const StudentGeneralLevelValues = [
  'Principiante',
  'Intermedio',
  'Avanzado',
  'Profesional',
] as const;
export type StudentGeneralLevel = (typeof StudentGeneralLevelValues)[number];
