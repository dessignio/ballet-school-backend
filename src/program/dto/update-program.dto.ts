/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/program/dto/update-program.dto.ts
// Removed PartialType as we define explicit fields for more control
import {
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
// DancerLevelName types/enums removed for validation as levels are now generic strings

export class UpdateProgramDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ageRange?: string;

  @IsOptional()
  @IsBoolean()
  hasLevels?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.hasLevels === true && o.levels !== undefined) // Validate only if hasLevels is true and levels are being provided
  @IsArray()
  @ArrayNotEmpty({
    message:
      "Levels cannot be empty if 'hasLevels' is true and levels are being updated.",
  })
  @IsString({ each: true, message: 'Each level must be a string.' })
  @MaxLength(100, {
    each: true,
    message: 'Each level name must be 100 characters or less.',
  })
  levels?: string[];
}
