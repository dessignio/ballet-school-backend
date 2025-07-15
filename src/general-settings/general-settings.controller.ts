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
    return this.settingsService.getSettings(req.user);
  }

  @Put()
  async updateSettings(
    @Body() updateDto: UpdateGeneralSettingsDto,
    @Req() req: Request,
  ): Promise<GeneralSettings> {
    return this.settingsService.updateSettings(updateDto, req.user);
  }
}
