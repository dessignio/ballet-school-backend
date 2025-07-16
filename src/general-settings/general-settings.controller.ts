// src/general-settings/general-settings.controller.ts
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
import { GeneralSettingsService } from './general-settings.service';
import { GeneralSettings } from './general-settings.entity';
import { UpdateGeneralSettingsDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

@Controller('settings/general')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class GeneralSettingsController {
  constructor(private readonly settingsService: GeneralSettingsService) {}

  @Get()
  async getSettings(@Req() req: Request): Promise<GeneralSettings> {
    // Apply type assertion
    return this.settingsService.getSettings(req.user as Partial<AdminUser>);
  }

  @Put()
  async updateSettings(
    @Body() updateDto: UpdateGeneralSettingsDto,
    @Req() req: Request,
  ): Promise<GeneralSettings> {
    // Apply type assertion
    return this.settingsService.updateSettings(
      updateDto,
      req.user as Partial<AdminUser>,
    );
  }
}
