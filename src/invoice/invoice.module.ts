// src/invoice/invoice.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './invoice.entity';
// No controller or service is explicitly defined here yet,
// as invoices might be created by other services (e.g., StripeService or a BillingService).

@Module({
  imports: [TypeOrmModule.forFeature([Invoice])],
  providers: [],
  exports: [TypeOrmModule], // Export TypeOrmModule to make InvoiceRepository available
})
export class InvoiceModule {}
