// src/calendar-settings/calendar-settings.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarSettings } from './calendar-settings.entity';
import { CalendarSettingsService } from './calendar-settings.service';
import { CalendarSettingsController } from './calendar-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarSettings])],
  providers: [CalendarSettingsService],
  controllers: [CalendarSettingsController],
})
export class CalendarSettingsModule {}
