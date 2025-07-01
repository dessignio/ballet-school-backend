// src/general-settings/general-settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralSettings } from './general-settings.entity';
import { GeneralSettingsService } from './general-settings.service';
import { GeneralSettingsController } from './general-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralSettings])],
  providers: [GeneralSettingsService],
  controllers: [GeneralSettingsController],
})
export class GeneralSettingsModule {}
