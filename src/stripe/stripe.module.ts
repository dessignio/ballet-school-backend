// src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { Student } from 'src/student/student.entity';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment } from 'src/payment/payment.entity';
import { Invoice } from 'src/invoice/invoice.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      MembershipPlanDefinitionEntity,
      Payment,
      Invoice,
    ]),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  // Exportamos el servicio si otros módulos necesitan usarlo
  exports: [StripeService],
})
export class StripeModule {}
