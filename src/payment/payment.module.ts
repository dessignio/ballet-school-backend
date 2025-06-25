// src/payment/payment.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
// No controller or service is explicitly defined here yet,
// as payments might be created by other services (e.g., StripeService).
// If direct CRUD operations for Payment are needed, a service/controller can be added.

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  providers: [],
  exports: [TypeOrmModule], // Export TypeOrmModule to make PaymentRepository available
})
export class PaymentModule {}
