// backend/settings/settings.controller.ts
import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateStripeSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('stripe')
  getStripeSettings() {
    return this.settingsService.getStripeSettings();
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async updateStripeSettings(@Body() updateDto: UpdateStripeSettingsDto) {
    await this.settingsService.updateStripeSettings(updateDto);
    return {
      message: 'Stripe settings updated successfully. Server is restarting to apply changes.',
    };
  }
}
