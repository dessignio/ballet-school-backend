// src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { Student } from 'src/student/student.entity';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment } from 'src/payment/payment.entity';
import { Invoice } from 'src/invoice/invoice.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { SettingsModule } from '../settings/settings.module';
import { Studio } from 'src/studio/studio.entity';

@Module({
  imports: [
    SettingsModule,
    ConfigModule,
    TypeOrmModule.forFeature([
      Student,
      MembershipPlanDefinitionEntity,
      Payment,
      Invoice,
      Studio,
    ]),
    NotificationModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
