// src/admin-user/admin-user.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserService } from './admin-user.service';
import { AdminUserController } from './admin-user.controller';
import { AdminUser } from './admin-user.entity';
// import { Role } from '../role/role.entity'; // Uncomment if RoleRepository is injected in AdminUserService

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUser]), // Add Role here if RoleRepository is used
  ],
  controllers: [AdminUserController],
  providers: [AdminUserService],
  exports: [AdminUserService], // Export if other modules (e.g., AuthModule) need it
})
export class AdminUserModule {}
