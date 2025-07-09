import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { ParentModule } from 'src/parent/parent.module';
import { StudentModule } from 'src/student/student.module';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';
import { jwtConstants } from 'src/auth/auth.module';
import { PortalModule } from 'src/portal/portal.module';

@Module({
  imports: [
    ParentModule,
    StudentModule,
    PassportModule,
    PortalModule,
    JwtModule.register({
      secret: jwtConstants.secret, // Reusing admin secret for simplicity, can be different
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [PortalAuthController],
  providers: [PortalAuthService, PortalJwtStrategy],
  exports: [PortalAuthService],
})
export class PortalAuthModule {}
