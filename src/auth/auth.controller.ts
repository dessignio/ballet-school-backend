/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/unbound-method */
// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';
import { Public } from './decorators/public.decorator';
import { RoleService } from 'src/role/role.service';
import { Role } from 'src/role/role.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly roleService: RoleService,
  ) {}

  @Public() // Mark this route as public
  @UsePipes(new ValidationPipe())
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.username,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { validatePassword, hashPassword, ...safeUser } = user as AdminUser;

    const token = await this.authService.login(safeUser);

    // Fetch role and permissions
    let permissions: string[] = [];
    if (safeUser.roleId) {
      try {
        const role: Role = await this.roleService.findOne(safeUser.roleId);
        if (role && role.permissions) {
          permissions = role.permissions;
        }
      } catch (e) {
        // Role not found, user will have no permissions. Log this.
        console.warn(
          `Could not find role with ID ${safeUser.roleId} for user ${safeUser.username}. User will have no permissions.`,
        );
      }
    }

    return {
      ...token,
      user: safeUser,
      permissions: permissions || [],
    };
  }
}
