import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { Studio } from '../studio/studio.entity';
import { AdminUser } from '../admin-user/admin-user.entity';
import { Role } from '../role/role.entity';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [TypeOrmModule.forFeature([Studio, AdminUser, Role]), StripeModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
