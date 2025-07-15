// backend/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeSettings } from '../stripe/stripe-settings.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([StripeSettings])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // Export SettingsService if it's used by other modules
})
export class SettingsModule {}
