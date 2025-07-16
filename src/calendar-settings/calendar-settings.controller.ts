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
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

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
    // Apply type assertion
    return this.settingsService.getSettings(req.user as Partial<AdminUser>);
  }

  @Put()
  async updateSettings(
    @Body() updateDto: UpdateCalendarSettingsDto,
    @Req() req: Request,
  ): Promise<CalendarSettings> {
    // Apply type assertion
    return this.settingsService.updateSettings(
      updateDto,
      req.user as Partial<AdminUser>,
    );
  }
}
