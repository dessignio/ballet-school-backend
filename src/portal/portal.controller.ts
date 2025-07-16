import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalJwtAuthGuard } from 'src/portal-auth/guards/portal-jwt-auth.guard';
import { Request } from 'express';

// 1. Definimos la interfaz REAL del payload del portal, que no tiene roleId.
interface PortalJwtPayload {
  userId: string;
  username: string;
  userType: 'parent' | 'student';
  studioId: string;
}

// 2. Eliminamos por completo la interfaz 'AuthenticatedRequest'.

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @UseGuards(PortalJwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: Request) {
    // 3. Usamos una aserción de tipo forzada.
    // 'as unknown' le dice a TypeScript: "Olvida el tipo que crees que tiene".
    // 'as PortalJwtPayload' le dice: "Ahora trátalo como este nuevo tipo".
    const { userId, userType, studioId } =
      req.user as unknown as PortalJwtPayload;

    return this.portalService.getProfile(userId, userType, studioId);
  }
}
