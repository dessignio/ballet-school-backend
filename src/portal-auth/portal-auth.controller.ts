import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PortalAuthService, ValidatedUser } from './portal-auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { PortalService } from 'src/portal/portal.service';

@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private readonly authService: PortalAuthService,
    private readonly portalService: PortalService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe())
  async login(@Body() loginDto: PortalLoginDto) {
    const user: ValidatedUser | null = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const token = await this.authService.login(user);

    const profile = await this.portalService.getProfile(user.id, user.userType);

    return {
      access_token: token.access_token,
      profile: profile,
    };
  }
}
