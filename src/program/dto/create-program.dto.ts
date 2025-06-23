/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/program/dto/create-program.dto.ts
import {
  IsString,
  IsArray,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  ValidateIf,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';
// ProgramName and DancerLevelName types/enums are removed from direct DTO validation
// as they are now generic strings.

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100) // Keep reasonable max length
  name: string; // Was ProgramName

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ageRange: string;

  @IsOptional()
  @IsBoolean()
  hasLevels?: boolean = false; // Default to false if not provided

  @IsOptional()
  @ValidateIf((o) => o.hasLevels === true)
  @IsArray()
  @ArrayNotEmpty({ message: "Levels are required if 'hasLevels' is true." })
  @IsString({ each: true, message: 'Each level must be a string.' })
  @MaxLength(100, {
    each: true,
    message: 'Each level name must be 100 characters or less.',
  })
  levels?: string[]; // Was DancerLevelName[]
}
