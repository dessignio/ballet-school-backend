/* eslint-disable @typescript-eslint/require-await */
// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import {
  AdminUserService,
  SafeAdminUser,
} from 'src/admin-user/admin-user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private adminUserService: AdminUserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<SafeAdminUser | null> {
    const user = await this.adminUserService.findByEmail(email);
    if (user && (await user.validatePassword(pass))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: SafeAdminUser) {
    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      studioId: user.studioId, // Add studioId to the JWT payload
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
