import {
  IsString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { MembershipPlanName } from '../types/membership-plan-name.type';

export class CreateMembershipPlanDto {
  @IsString({ message: 'Plan name must be a string.' })
  @IsNotEmpty({ message: 'Plan name is required.' })
  @MaxLength(100, {
    message: 'Plan name cannot be longer than 100 characters.',
  })
  name: MembershipPlanName; // This type is now 'string'

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
}
