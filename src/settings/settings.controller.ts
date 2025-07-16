// backend/settings/settings.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateStripeSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

// Define a type for the JWT payload for type safety
interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  studioId: string;
}

@UseGuards(JwtAuthGuard) // Protect all routes in this controller
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('stripe')
  getStripeSettings(@Req() req: Request) {
    // Apply type assertion before accessing property
    const studioId = (req.user as JwtPayload).studioId;
    return this.settingsService.getStripeSettings(studioId);
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async updateStripeSettings(
    @Body() updateDto: UpdateStripeSettingsDto,
    @Req() req: Request,
  ) {
    // Apply type assertion
    const studioId = (req.user as JwtPayload).studioId;
    await this.settingsService.updateStripeSettings(updateDto, studioId);
    return {
      message: 'Stripe settings updated successfully.',
    };
  }
}
