// src/instructor/types/program-name.type.ts
export const ProgramNameValues = [
  'New Stars',
  'Little Giants',
  'Dancers',
] as const;
export type ProgramName = (typeof ProgramNameValues)[number];
