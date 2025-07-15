// backend/settings/settings.controller.ts
import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateStripeSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('stripe')
  getStripeSettings(@Req() req: Request) {
    const studioId = req.user.studioId;
    return this.settingsService.getStripeSettings(studioId);
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async updateStripeSettings(@Body() updateDto: UpdateStripeSettingsDto, @Req() req: Request) {
    const studioId = req.user.studioId;
    await this.settingsService.updateStripeSettings(updateDto, studioId);
    return {
      message: 'Stripe settings updated successfully.',
    };
  }
}
