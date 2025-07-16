// src/program/program.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from './program.entity';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
  ) {}

  async create(
    createProgramDto: CreateProgramDto,
    user: Partial<AdminUser>,
  ): Promise<Program> {
    const { name, levels } = createProgramDto;
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }

    const existingProgram = await this.programRepository.findOne({
      where: { name, studioId },
    });
    if (existingProgram) {
      throw new ConflictException(
        `Program with name "${name}" already exists in this studio.`,
      );
    }

    const program = this.programRepository.create({
      ...createProgramDto,
      studioId,
    });

    if (name === 'Dancers') {
      if (!levels || levels.length === 0) {
        throw new BadRequestException(
          "Levels are required for the 'Dancers' program.",
        );
      }
      program.levels = levels;
    } else {
      program.levels = undefined;
    }

    return this.programRepository.save(program);
  }

  async findAll(user: Partial<AdminUser>): Promise<Program[]> {
    return this.programRepository.find({
      where: { studioId: user.studioId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<Program> {
    const program = await this.programRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    if (!program) {
      throw new NotFoundException(`Program with ID "${id}" not found`);
    }
    return program;
  }

  async update(
    id: string,
    updateProgramDto: UpdateProgramDto,
    user: Partial<AdminUser>,
  ): Promise<Program> {
    const program = await this.programRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    if (!program) {
      throw new NotFoundException(
        `Program with ID "${id}" not found to update.`,
      );
    }

    let newLevels = updateProgramDto.levels;

    if (program.name === 'Dancers') {
      if (updateProgramDto.levels === undefined) {
        newLevels = program.levels;
      }
    } else {
      newLevels = undefined;
    }

    const updatedProgramPartial = await this.programRepository.preload({
      id: id,
      ageRange: updateProgramDto.ageRange,
      levels: newLevels,
    });

    if (!updatedProgramPartial) {
      throw new NotFoundException(
        `Program with ID "${id}" could not be preloaded for update.`,
      );
    }

    program.ageRange =
      updatedProgramPartial.ageRange !== undefined
        ? updatedProgramPartial.ageRange
        : program.ageRange;
    program.levels =
      updatedProgramPartial.levels !== undefined
        ? updatedProgramPartial.levels
        : program.levels;

    return this.programRepository.save(program);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const result = await this.programRepository.delete({
      id,
      studioId: user.studioId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Program with ID "${id}" not found to delete`,
      );
    }
  }
}
