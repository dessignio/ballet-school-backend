/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalJwtAuthGuard } from 'src/portal-auth/guards/portal-jwt-auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    userType: 'parent' | 'student';
  };
}

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @UseGuards(PortalJwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    const { userId, userType } = req.user;
    return this.portalService.getProfile(userId, userType);
  }
}
