/* eslint-disable @typescript-eslint/no-unused-vars */
// src/parent/parent.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parent } from './parent.entity';
import { CreateParentDto, UpdateParentDto } from './dto';

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

  async findByUsername(username: string): Promise<Parent | null> {
    return this.parentRepository
      .createQueryBuilder('parent')
      .addSelect('parent.password')
      .where('parent.username = :username', { username })
      .getOne();
  }

  async create(createParentDto: CreateParentDto): Promise<SafeParent> {
    const { email, username } = createParentDto;
    const existingByEmail = await this.parentRepository.findOne({
      where: { email },
    });
    if (existingByEmail) {
      throw new ConflictException(`Email "${email}" already exists.`);
    }
    const existingByUsername = await this.parentRepository.findOne({
      where: { username },
    });
    if (existingByUsername) {
      throw new ConflictException(`Username "${username}" already exists.`);
    }
    const parent = this.parentRepository.create(createParentDto);
    const savedParent = await this.parentRepository.save(parent);
    return this.transformToSafe(savedParent);
  }

  async findAll(): Promise<SafeParent[]> {
    const parents = await this.parentRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return parents.map((p) => this.transformToSafe(p));
  }

  async findOne(id: string): Promise<SafeParent> {
    const parent = await this.parentRepository.findOneBy({ id });
    if (!parent) {
      throw new NotFoundException(`Parent with ID "${id}" not found.`);
    }
    return this.transformToSafe(parent);
  }

  async update(
    id: string,
    updateParentDto: UpdateParentDto,
  ): Promise<SafeParent> {
    const parent = await this.parentRepository.preload({
      id,
      ...updateParentDto,
    });
    if (!parent) {
      throw new NotFoundException(
        `Parent with ID "${id}" not found to update.`,
      );
    }
    // Preload will apply BeforeUpdate hook if password is changed.
    const savedParent = await this.parentRepository.save(parent);
    return this.transformToSafe(savedParent);
  }

  async remove(id: string): Promise<void> {
    const result = await this.parentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Parent with ID "${id}" not found to delete.`,
      );
    }
  }
}
