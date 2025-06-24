// src/membership-plan/dto/create-membership-plan.dto.ts
import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  MaxLength,
  IsOptional,
} from 'class-validator';
// MembershipPlanName type is now just string, direct import for type checking might not be needed
// import { MembershipPlanName } from '../types/membership-plan-name.type';

export class CreateMembershipPlanDto {
  @IsString({ message: 'Plan name must be a string.' })
  @IsNotEmpty({ message: 'Plan name is required.' })
  @MaxLength(100, {
    message: 'Plan name cannot be longer than 100 characters.',
  })
  name: string; // Was MembershipPlanName

  @IsInt({ message: 'Classes per week must be an integer.' })
  @Min(0, { message: 'Classes per week cannot be negative.' })
  @IsNotEmpty({ message: 'Classes per week is required.' })
  classesPerWeek: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Monthly price must be a number with up to 2 decimal places.' },
  )
  @Min(0, { message: 'Monthly price cannot be negative.' })
  @IsNotEmpty({ message: 'Monthly price is required.' })
  monthlyPrice: number;

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

  // Stripe Price ID is now truly optional on creation. Backend will handle if not provided.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceId?: string;
}
