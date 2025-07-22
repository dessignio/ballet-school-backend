/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminUserModule } from 'src/admin-user/admin-user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RoleModule } from 'src/role/role.module';

export const jwtConstants = {
  // In a real app, this should be in an environment variable and much more complex.
  secret: 'SUPER_SECRET_KEY_FOR_ADALUSA_ART_PLATFORM_CHANGE_IN_PRODUCTION',
};

@Module({
  imports: [
    AdminUserModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '8h' }, // Token expires in 8 hours
    }),
    RoleModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
