/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/admin-user/admin-user.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { AdminUserStatus } from './types/admin-user-status.type';
// import { Role } from '../role/role.entity'; // If role validation is needed

// Helper type for user data without password and internal methods
export type SafeAdminUser = Omit<
  AdminUser,
  'password' | 'validatePassword' | 'hashPassword'
>;

@Injectable()
export class AdminUserService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    // @InjectRepository(Role) // Uncomment if validating roleId against Role table
    // private roleRepository: Repository<Role>,
  ) {}

  private transformToSafeUser(user: AdminUser): SafeAdminUser {
    const { password, validatePassword, hashPassword, ...safeUser } = user;
    return safeUser;
  }

  private transformToSafeUsers(users: AdminUser[]): SafeAdminUser[] {
    return users.map((user) => this.transformToSafeUser(user));
  }

  async create(
    createAdminUserDto: CreateAdminUserDto,
    studioId: string,
  ): Promise<SafeAdminUser> {
    const { username, email } = createAdminUserDto;

    const existingByUsername = await this.adminUserRepository.findOne({
      where: { username, studio: { id: studioId } },
    });
    if (existingByUsername) {
      throw new ConflictException(`Username "${username}" already exists.`);
    }

    const existingByEmail = await this.adminUserRepository.findOne({
      where: { email, studio: { id: studioId } },
    });
    if (existingByEmail) {
      throw new ConflictException(`Email "${email}" already exists.`);
    }

    try {
      const adminUser = this.adminUserRepository.create({
        ...createAdminUserDto,
        studio: { id: studioId },
      });
      const savedUser = await this.adminUserRepository.save(adminUser);
      return this.transformToSafeUser(savedUser);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username or email already exists.');
      }
      console.error('Error creating admin user:', error);
      throw new InternalServerErrorException('Could not create admin user.');
    }
  }

  async findAll(studioId: string): Promise<SafeAdminUser[]> {
    const users = await this.adminUserRepository.find({
      where: { studio: { id: studioId } },
      order: { username: 'ASC' },
    });
    return this.transformToSafeUsers(users);
  }

  async findOne(id: string, studioId: string): Promise<SafeAdminUser> {
    const user = await this.adminUserRepository.findOne({
      where: { id, studio: { id: studioId } },
    });
    if (!user) {
      throw new NotFoundException(`Admin user with ID "${id}" not found`);
    }
    return this.transformToSafeUser(user);
  }

  async findByUsername(username: string): Promise<AdminUser | undefined> {
    // This method remains global for authentication purposes, assuming usernames are globally unique for login.
    // If usernames only need to be unique per studio, a studioId parameter would be required.
    const user = await this.adminUserRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
    return user || undefined;
  }

  async findOneWithPassword(id: string): Promise<AdminUser> {
    // This is for internal auth use and should not be filtered by studioId
    // to allow system-level operations if necessary.
    const user = await this.adminUserRepository
      .createQueryBuilder('user')
      .select('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) {
      throw new NotFoundException(`Admin user with ID "${id}" not found`);
    }
    return user;
  }

  async update(
    id: string,
    updateAdminUserDto: UpdateAdminUserDto,
    studioId: string,
  ): Promise<SafeAdminUser> {
    const userToUpdate = await this.adminUserRepository.findOne({
      where: { id, studio: { id: studioId } },
    });
    if (!userToUpdate) {
      throw new NotFoundException(
        `Admin user with ID "${id}" not found to update.`,
      );
    }

    const { username, email } = updateAdminUserDto;
    if (username && username !== userToUpdate.username) {
      const existingByUsername = await this.adminUserRepository.findOne({
        where: { username, studio: { id: studioId } },
      });
      if (existingByUsername) {
        throw new ConflictException(`Username "${username}" already exists.`);
      }
    }

    if (email && email !== userToUpdate.email) {
      const existingByEmail = await this.adminUserRepository.findOne({
        where: { email, studio: { id: studioId } },
      });
      if (existingByEmail) {
        throw new ConflictException(`Email "${email}" already exists.`);
      }
    }

    const updatedUserPartial = await this.adminUserRepository.preload({
      id: id,
      ...updateAdminUserDto,
    });

    if (!updatedUserPartial) {
      throw new NotFoundException(
        `Admin user with ID "${id}" could not be preloaded for update.`,
      );
    }

    try {
      const savedUser = await this.adminUserRepository.save(updatedUserPartial);
      return this.transformToSafeUser(savedUser);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Update would result in duplicate username or email.',
        );
      }
      console.error('Error updating admin user:', error);
      throw new InternalServerErrorException('Could not update admin user.');
    }
  }

  async remove(id: string, studioId: string): Promise<void> {
    const result = await this.adminUserRepository.delete({
      id,
      studio: { id: studioId },
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Admin user with ID "${id}" not found to delete`,
      );
    }
  }

  async bulkUpdateStatus(
    ids: string[],
    status: AdminUserStatus,
    studioId: string,
  ): Promise<{ updatedCount: number }> {
    if (!ids || ids.length === 0) {
      return { updatedCount: 0 };
    }
    const result = await this.adminUserRepository.update(
      { id: In(ids), studio: { id: studioId } },
      { status: status },
    );
    return { updatedCount: result.affected || 0 };
  }

  async bulkUpdateRole(
    ids: string[],
    roleId: string,
    studioId: string,
  ): Promise<{ updatedCount: number }> {
    if (!ids || ids.length === 0) {
      return { updatedCount: 0 };
    }
    const result = await this.adminUserRepository.update(
      { id: In(ids), studio: { id: studioId } },
      { roleId: roleId },
    );
    return { updatedCount: result.affected || 0 };
  }
}
('');
