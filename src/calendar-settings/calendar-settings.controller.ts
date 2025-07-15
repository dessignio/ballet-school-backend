// src/calendar-settings/calendar-settings.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CalendarSettingsService } from './calendar-settings.service';
import { CalendarSettings } from './calendar-settings.entity';
import { UpdateCalendarSettingsDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('settings/calendar')
@UseGuards(JwtAuthGuard)
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
  async getSettings(@Req() req: Request): Promise<CalendarSettings> {
    return this.settingsService.getSettings(req.user);
  }

  @Put()
  async updateSettings(
    @Body() updateDto: UpdateCalendarSettingsDto,
    @Req() req: Request,
  ): Promise<CalendarSettings> {
    return this.settingsService.updateSettings(updateDto, req.user);
  }
}
