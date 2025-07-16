// src/role/role.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto, studioId: string): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name, studioId },
    });
    if (existingRole) {
      throw new ConflictException(
        `Role with name "${createRoleDto.name}" already exists in this studio.`,
      );
    }
    const newRole = this.roleRepository.create({ ...createRoleDto, studioId });
    return this.roleRepository.save(newRole);
  }

  async findAll(studioId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { studioId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, studioId: string): Promise<Role> {
    const role = await this.roleRepository.findOneBy({ id, studioId });
    if (!role) {
      throw new NotFoundException(
        `Role with ID "${id}" not found in this studio`,
      );
    }
    return role;
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
    studioId: string,
  ): Promise<Role> {
    if (updateRoleDto.name) {
      const existingRoleWithSameName = await this.roleRepository.findOne({
        where: { name: updateRoleDto.name, studioId },
      });
      if (existingRoleWithSameName && existingRoleWithSameName.id !== id) {
        throw new ConflictException(
          `Another role with name "${updateRoleDto.name}" already exists in this studio.`,
        );
      }
    }

    const role = await this.roleRepository.preload({
      id: id,
      ...updateRoleDto,
    });
    if (!role || role.studioId !== studioId) {
      throw new NotFoundException(
        `Role with ID "${id}" not found in this studio to update`,
      );
    }
    return this.roleRepository.save(role);
  }

  async remove(id: string, studioId: string): Promise<void> {
    // TODO: Add logic to check if any admin users are assigned this role before deletion
    const result = await this.roleRepository.delete({ id, studioId });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Role with ID "${id}" not found in this studio to delete`,
      );
    }
  }
}
