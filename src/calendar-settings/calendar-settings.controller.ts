// src/calendar-settings/calendar-settings.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CalendarSettingsService } from './calendar-settings.service';
import { CalendarSettings } from './calendar-settings.entity';
import { UpdateCalendarSettingsDto } from './dto';

@Controller('settings/calendar')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class CalendarSettingsController {
  constructor(private readonly settingsService: CalendarSettingsService) {}

  @Get()
  async getSettings(): Promise<CalendarSettings> {
    return this.settingsService.getSettings();
  }

  // Use PUT for a full replacement of the settings document
  @Put()
  async updateSettings(
    @Body() updateDto: UpdateCalendarSettingsDto,
  ): Promise<CalendarSettings> {
    return this.settingsService.updateSettings(updateDto);
  }
}
