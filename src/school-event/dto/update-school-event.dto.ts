// ballet-school-backend/src/school-event/dto/update-school-event.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateSchoolEventDto } from './create-school-event.dto';

export class UpdateSchoolEventDto extends PartialType(CreateSchoolEventDto) {}
