// src/class-offering/dto/create-class-offering.dto.ts
import {
  IsString,
  IsArray,
  IsNotEmpty,
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

export class CreateClassOfferingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @IsEnum(StudentGeneralLevelValues, {
    message: `Level must be one of: ${StudentGeneralLevelValues.join(', ')}`,
  })
  @IsNotEmpty()
  level: StudentGeneralLevel;

  @IsOptional()
  @IsUrl({}, { message: 'Icon URL must be a valid URL.' })
  @MaxLength(2048)
  iconUrl?: string;

  @IsString()
  @IsNotEmpty()
  descriptionShort: string;

  @IsOptional()
  @IsString()
  descriptionLong?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  duration: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  price: string;

  @IsInt({ message: 'Capacity must be an integer.' })
  @Min(0, { message: 'Capacity cannot be less than 0.' })
  @IsNotEmpty({ message: 'Capacity is required.' })
  capacity: number;

  @IsOptional()
  @IsUrl({}, { message: 'Video Embed URL must be a valid URL.' })
  @MaxLength(2048)
  videoEmbedUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  instructorName: string;

  @IsOptional()
  @IsString()
  instructorBio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @IsOptional()
  @IsArray()
  // Add @IsEnum if ProgramName becomes a strict enum validated from a list
  @IsString({ each: true })
  targetPrograms?: ProgramName[];

  @IsOptional()
  @IsArray()
  // Add @IsEnum if DancerLevelName becomes a strict enum
  @IsString({ each: true })
  targetDancerLevels?: DancerLevelName[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduledClassSlotDto)
  scheduledClassSlots: CreateScheduledClassSlotDto[];
}
