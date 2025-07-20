// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import {
  AdminUserService,
  SafeAdminUser,
} from 'src/admin-user/admin-user.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Studio } from 'src/studio/studio.entity';

@Injectable()
export class AuthService {
  constructor(
    private adminUserService: AdminUserService,
    private jwtService: JwtService,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
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
    const studio = await this.studioRepository.findOneBy({ id: user.studioId });
    const stripeAccountId = studio ? studio.stripeAccountId : null;

    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      studioId: user.studioId,
      stripeAccountId: stripeAccountId, // Add stripeAccountId to the JWT payload
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: { ...user, stripeAccountId: stripeAccountId }, // Add stripeAccountId to the user object in the response
    };
  }
}
