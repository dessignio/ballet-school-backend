// src/membership-plan/dto/update-membership-plan.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMembershipPlanDto } from './create-membership-plan.dto';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';
import { MembershipPlanName } from '../types/membership-plan-name.type';

export class UpdateMembershipPlanDto extends PartialType(
  CreateMembershipPlanDto,
) {
  @IsOptional()
  @IsString({ message: 'Plan name must be a string if provided.' })
  @MaxLength(100, {
    message: 'Plan name cannot be longer than 100 characters if provided.',
  })
  name?: MembershipPlanName;

  @IsOptional()
  @IsInt({ message: 'Classes per week must be an integer.' })
  @Min(0, { message: 'Classes per week cannot be negative.' })
  classesPerWeek?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Monthly price must be a number with up to 2 decimal places.' },
  )
  @Min(0, { message: 'Monthly price cannot be negative.' })
  monthlyPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Description cannot be longer than 500 characters.',
  })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'Duration in months must be an integer.' })
  @Min(1, { message: 'Duration must be at least 1 month if provided.' })
  durationMonths?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceId?: string;
}
