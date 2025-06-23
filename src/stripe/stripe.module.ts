// src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { Student } from 'src/student/student.entity';
// Potentially import MembershipPlan entity if you need to map Stripe Price IDs to local plans

@Module({
  imports: [
    TypeOrmModule.forFeature([Student]), // And MembershipPlan if needed
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService], // Export if other modules need to use StripeService
})
export class StripeModule {}
