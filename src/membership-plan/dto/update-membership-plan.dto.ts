// src/membership-plan/dto/update-membership-plan.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateMembershipPlanDto } from './create-membership-plan.dto';
import { IsString, IsOptional, MaxLength } from 'class-validator'; // Removed IsEnum
import { MembershipPlanName } from '../types/membership-plan-name.type';

export class UpdateMembershipPlanDto extends PartialType(
  CreateMembershipPlanDto,
) {
  @IsOptional()
  @IsString({ message: 'Plan name must be a string if provided.' })
  @MaxLength(100, {
    message: 'Plan name cannot be longer than 100 characters if provided.',
  })
  name?: MembershipPlanName; // This type is now 'string'
}
