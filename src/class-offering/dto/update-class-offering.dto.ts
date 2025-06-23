// src/class-offering/dto/update-class-offering.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateClassOfferingDto } from './create-class-offering.dto';
import {
  IsString,
  IsArray,
  IsOptional,
  IsUrl,
  MaxLength,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateScheduledClassSlotDto } from 'src/scheduled-class-slot/dto/create-scheduled-class-slot.dto';
import { ProgramName } from 'src/program/types/program-name.type';
import { DancerLevelName } from 'src/program/types/dancer-level-name.type';
import {
  StudentGeneralLevel,
  StudentGeneralLevelValues,
} from 'src/student/types/student-general-level.type';

export class UpdateClassOfferingDto extends PartialType(
  CreateClassOfferingDto,
) {
  // Explicitly define properties to help TypeScript's type inference,
  // especially for destructuring and accessing properties on `restOfUpdateDto`.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(StudentGeneralLevelValues, {
    message: `Level must be one of: ${StudentGeneralLevelValues.join(', ')}`,
  })
  level?: StudentGeneralLevel;

  @IsOptional()
  @IsUrl({}, { message: 'Icon URL must be a valid URL.' })
  @MaxLength(2048)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  descriptionShort?: string;

  @IsOptional()
  @IsString()
  descriptionLong?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  price?: string;

  @IsOptional()
  @IsInt({ message: 'Capacity must be an integer.' })
  @Min(0, { message: 'Capacity cannot be less than 0.' })
  capacity?: number;

  @IsOptional()
  @IsUrl({}, { message: 'Video Embed URL must be a valid URL.' })
  @MaxLength(2048)
  videoEmbedUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  instructorName?: string;

  @IsOptional()
  @IsString()
  instructorBio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPrograms?: ProgramName[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetDancerLevels?: DancerLevelName[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduledClassSlotDto) // Ensures validation and transformation for nested DTOs
  scheduledClassSlots?: CreateScheduledClassSlotDto[];
}
