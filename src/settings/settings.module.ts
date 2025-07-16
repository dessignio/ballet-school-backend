// backend/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeSettings } from '../stripe/stripe-settings.entity';
import { Studio } from '../studio/studio.entity'; // <-- 1. Importa la entidad Studio

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Studio, // <-- 2. Añade Studio al array
      StripeSettings,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
