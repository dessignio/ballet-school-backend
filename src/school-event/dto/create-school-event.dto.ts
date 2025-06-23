// ballet-school-backend/src/school-event/dto/create-school-event.dto.ts
// Add NestJS validation decorators (e.g., @IsString, @IsDateString) for a production app.

export class CreateSchoolEventDto {
  date: string; // Expected format: YYYY-MM-DD
  name: string;
  description?: string;
  isHoliday?: boolean;
}
