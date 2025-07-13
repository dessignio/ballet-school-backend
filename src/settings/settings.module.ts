// backend/settings/settings.module.ts
import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
