// src/auth/auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AuthService.name);

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
    this.logger.log(
      `AuthService: Studio found: ${studio ? studio.id : 'none'}, Stripe Account ID: ${stripeAccountId}`,
    ); // NEW LOG

    const payload = {
      username: user.username,
      sub: user.id,
      roleId: user.roleId,
      studioId: user.studioId,
      stripeAccountId: stripeAccountId, // Add stripeAccountId to the JWT payload
    };
    const userForResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.roleId,
      roleName: user.role?.name, // Assuming role is loaded and has a name
      status: user.status,
      studioId: user.studioId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stripeAccountId: stripeAccountId, // Explicitly add stripeAccountId
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: userForResponse, // Return the newly constructed user object
    };
  }
}
