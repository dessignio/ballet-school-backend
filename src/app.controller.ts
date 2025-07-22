/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { AdminUserService } from './admin-user/admin-user.service';
import { RoleService } from './role/role.service';
import { PermissionKeyValues } from 'src/role/types/permission-key.type';
import {
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Role } from './role/role.entity';
import { Repository } from 'typeorm';
import { AdminUser } from './admin-user/admin-user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly adminUserService: AdminUserService,
    private readonly roleService: RoleService,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/create-admin-seed')
  async createAdminSeed() {
    try {
      console.log('Attempting to create Admin role...');
      const adminRole = await this.roleService.create({
        name: 'Admin',
        permissions: Object.values(PermissionKeyValues), // Grant all permissions
      });
      console.log('Admin role created:', adminRole);

      console.log('Attempting to create admin user...');
      const adminUser = await this.adminUserService.create({
        username: 'admin_temp',
        email: 'admin_temp@example.com',
        password: 'Password123!', // You will use this to log in
        roleId: adminRole.id,
        firstName: 'Admin',
        lastName: 'Temp',
      });
      console.log('Admin user created:', adminUser);

      return {
        message: 'Admin role and user created successfully!',
        role: adminRole,
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        console.warn('Conflict detected, trying to recover...', error.message);
        const adminRole = await this.roleRepository.findOne({
          where: { name: 'Admin' },
        });
        if (!adminRole) {
          throw new InternalServerErrorException(
            'Admin role exists but could not be fetched.',
          );
        }

        const existingUser = await this.adminUserRepository.findOne({
          where: { username: 'admin_temp' },
        });
        if (existingUser) {
          console.log('Admin user already exists.');
          return { message: 'Admin user already exists.' };
        }

        console.log('Role already existed. Creating user with existing role.');
        const adminUser = await this.adminUserService.create({
          username: 'admin_temp',
          email: 'admin_temp@example.com',
          password: 'Password123!',
          roleId: adminRole.id,
          firstName: 'Admin',
          lastName: 'Temp',
        });

        return {
          message:
            'Role already existed, but admin user was created successfully!',
          user: {
            id: adminUser.id,
            username: adminUser.username,
            email: adminUser.email,
          },
        };
      }
      console.error('Error seeding admin data:', error);
      throw new InternalServerErrorException('Error seeding admin data.');
    }
  }
}
