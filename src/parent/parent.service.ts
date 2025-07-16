/* eslint-disable @typescript-eslint/no-unused-vars */
// src/parent/parent.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from './parent.entity';
import { CreateParentDto, UpdateParentDto } from './dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

export type SafeParent = Omit<
  Parent,
  'password' | 'validatePassword' | 'hashPassword'
>;

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
  ) {}

  private transformToSafe(parent: Parent): SafeParent {
    const { password, ...safeParent } = parent;
    return safeParent;
  }

  async findByUsername(
    username: string,
    studioId: string,
  ): Promise<Parent | null> {
    return this.parentRepository
      .createQueryBuilder('parent')
      .addSelect('parent.password')
      .where('parent.username = :username', { username })
      .andWhere('parent.studioId = :studioId', { studioId })
      .getOne();
  }

  async create(
    createParentDto: CreateParentDto,
    user: Partial<AdminUser>,
  ): Promise<SafeParent> {
    const { email, username } = createParentDto;
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }

    const existingByEmail = await this.parentRepository.findOne({
      where: { email, studioId },
    });
    if (existingByEmail) {
      throw new ConflictException(
        `Email "${email}" already exists in this studio.`,
      );
    }
    const existingByUsername = await this.parentRepository.findOne({
      where: { username, studioId },
    });
    if (existingByUsername) {
      throw new ConflictException(
        `Username "${username}" already exists in this studio.`,
      );
    }
    const parent = this.parentRepository.create({
      ...createParentDto,
      studioId,
    });
    const savedParent = await this.parentRepository.save(parent);
    return this.transformToSafe(savedParent);
  }

  async findAll(user: Partial<AdminUser>): Promise<SafeParent[]> {
    const parents = await this.parentRepository.find({
      where: { studioId: user.studioId },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return parents.map((p) => this.transformToSafe(p));
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<SafeParent> {
    const parent = await this.parentRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found.`);
    }
    return this.transformToSafe(parent);
  }

  async update(
    id: string,
    updateParentDto: UpdateParentDto,
    user: Partial<AdminUser>,
  ): Promise<SafeParent> {
    const parent = await this.parentRepository.preload({
      id,
      ...updateParentDto,
    });
    if (!parent || parent.studioId !== user.studioId) {
      throw new NotFoundException(
        `Parent with ID "${id}" not found to update.`,
      );
    }
    const savedParent = await this.parentRepository.save(parent);
    return this.transformToSafe(savedParent);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const result = await this.parentRepository.delete({
      id,
      studioId: user.studioId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Parent with ID "${id}" not found to delete.`,
      );
    }
  }
}
