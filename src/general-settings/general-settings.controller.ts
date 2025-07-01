// src/general-settings/general-settings.controller.ts
import {
  Controller,
  Get,
  Put,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GeneralSettingsService } from './general-settings.service';
import { GeneralSettings } from './general-settings.entity';
import { UpdateGeneralSettingsDto } from './dto';

@Controller('settings/general')
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
  async getSettings(): Promise<GeneralSettings> {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(
    @Body() updateDto: UpdateGeneralSettingsDto,
  ): Promise<GeneralSettings> {
    return this.settingsService.updateSettings(updateDto);
  }
}
