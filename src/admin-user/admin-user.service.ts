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

  async create(createAdminUserDto: CreateAdminUserDto): Promise<SafeAdminUser> {
    const { username, email, roleId } = createAdminUserDto;

    const existingByUsername = await this.adminUserRepository.findOne({
      where: { username },
    });
    if (existingByUsername) {
      throw new ConflictException(`Username "${username}" already exists.`);
    }

    const existingByEmail = await this.adminUserRepository.findOne({
      where: { email },
    });
    if (existingByEmail) {
      throw new ConflictException(`Email "${email}" already exists.`);
    }

    // Optional: Validate roleId if Role entity/repository is available
    // const roleExists = await this.roleRepository.findOneBy({ id: roleId });
    // if (!roleExists) {
    //   throw new NotFoundException(`Role with ID "${roleId}" not found.`);
    // }

    try {
      const adminUser = this.adminUserRepository.create(createAdminUserDto);
      const savedUser = await this.adminUserRepository.save(adminUser);
      return this.transformToSafeUser(savedUser);
    } catch (error) {
      // Catch potential DB constraint errors not caught by prior checks (e.g., race conditions)
      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException('Username or email already exists.');
      }
      console.error('Error creating admin user:', error);
      throw new InternalServerErrorException('Could not create admin user.');
    }
  }

  async findAll(): Promise<SafeAdminUser[]> {
    const users = await this.adminUserRepository.find({
      order: { username: 'ASC' },
    });
    return this.transformToSafeUsers(users);
  }

  async findOne(id: string): Promise<SafeAdminUser> {
    const user = await this.adminUserRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Admin user with ID "${id}" not found`);
    }
    return this.transformToSafeUser(user);
  }

  async findByUsername(username: string): Promise<AdminUser | undefined> {
    const user = await this.adminUserRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // Explicitly select the password
      .where('user.username = :username', { username })
      .getOne();

    // Si getOne() devuelve null, retornamos undefined para cumplir con la firma.
    return user || undefined;
  }

  async findOneWithPassword(id: string): Promise<AdminUser> {
    // For internal auth use
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
  ): Promise<SafeAdminUser> {
    const userToUpdate = await this.adminUserRepository.findOneBy({ id });
    if (!userToUpdate) {
      throw new NotFoundException(
        `Admin user with ID "${id}" not found to update.`,
      );
    }

    const usernameFromDto = updateAdminUserDto.username;
    if (usernameFromDto && usernameFromDto !== userToUpdate.username) {
      const existingByUsername = await this.adminUserRepository.findOne({
        where: { username: usernameFromDto },
      });
      if (existingByUsername) {
        throw new ConflictException(
          `Username "${usernameFromDto}" already exists.`,
        );
      }
    }

    const emailFromDto = updateAdminUserDto.email;
    if (emailFromDto && emailFromDto !== userToUpdate.email) {
      const existingByEmail = await this.adminUserRepository.findOne({
        where: { email: emailFromDto },
      });
      if (existingByEmail) {
        throw new ConflictException(`Email "${emailFromDto}" already exists.`);
      }
    }

    // const roleIdFromDto = updateAdminUserDto.roleId;
    // Optional: Validate roleId if provided
    // if (roleIdFromDto) {
    //   const roleExists = await this.roleRepository.findOneBy({ id: roleIdFromDto });
    //   if (!roleExists) {
    //     throw new NotFoundException(`Role with ID "${roleIdFromDto}" not found.`);
    //   }
    // }

    // Merge existing user with DTO. `preload` handles this well.
    // If DTO has password, entity's BeforeUpdate hook will hash it.
    const updatedUserPartial = await this.adminUserRepository.preload({
      id: id,
      ...updateAdminUserDto, // Spread all properties from DTO
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

  async remove(id: string): Promise<void> {
    const result = await this.adminUserRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Admin user with ID "${id}" not found to delete`,
      );
    }
  }

  async bulkUpdateStatus(
    ids: string[],
    status: AdminUserStatus,
  ): Promise<{ updatedCount: number }> {
    if (!ids || ids.length === 0) {
      return { updatedCount: 0 };
    }
    const result = await this.adminUserRepository.update(
      { id: In(ids) },
      { status: status },
    );
    return { updatedCount: result.affected || 0 };
  }

  async bulkUpdateRole(
    ids: string[],
    roleId: string,
  ): Promise<{ updatedCount: number }> {
    if (!ids || ids.length === 0) {
      return { updatedCount: 0 };
    }
    // Optional: Validate roleId here if needed
    // const roleExists = await this.roleRepository.findOneBy({ id: roleId });
    // if (!roleExists) {
    //   throw new NotFoundException(`Role with ID "${roleId}" not found for bulk update.`);
    // }
    const result = await this.adminUserRepository.update(
      { id: In(ids) },
      { roleId: roleId },
    );
    return { updatedCount: result.affected || 0 };
  }
}
