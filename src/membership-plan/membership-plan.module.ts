// src/membership-plan/membership-plan.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipPlanDefinitionEntity } from './membership-plan.entity';
import { MembershipPlanService } from './membership-plan.service';
import { MembershipPlanController } from './membership-plan.controller';
import { StripeModule } from 'src/stripe/stripe.module'; // Import StripeModule

@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipPlanDefinitionEntity]),
    StripeModule, // Add StripeModule here
  ],
  controllers: [MembershipPlanController],
  providers: [MembershipPlanService],
})
export class MembershipPlanModule {}
