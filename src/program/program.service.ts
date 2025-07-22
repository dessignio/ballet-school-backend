/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { ProgramName } from './types/program-name.type';

@Injectable()
export class ProgramService {
  constructor(
    @InjectRepository(Program)
    private programRepository: Repository<Program>,
  ) {}

  async create(createProgramDto: CreateProgramDto): Promise<Program> {
    const { name, levels } = createProgramDto;

    const existingProgram = await this.programRepository.findOne({
      where: { name },
    });
    if (existingProgram) {
      throw new ConflictException(
        `Program with name "${name}" already exists.`,
      );
    }

    const program = this.programRepository.create(createProgramDto);

    if (name === 'Dancers') {
      if (!levels || levels.length === 0) {
        throw new BadRequestException(
          "Levels are required for the 'Dancers' program.",
        );
      }
      program.levels = levels;
    } else {
      // Ensure levels are not set for non-Dancers programs
      program.levels = undefined;
    }

    return this.programRepository.save(program);
  }

  async findAll(): Promise<Program[]> {
    return this.programRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Program> {
    const program = await this.programRepository.findOneBy({ id });
    if (!program) {
      throw new NotFoundException(`Program with ID "${id}" not found`);
    }
    return program;
  }

  async update(
    id: string,
    updateProgramDto: UpdateProgramDto,
  ): Promise<Program> {
    const program = await this.programRepository.findOneBy({ id });
    if (!program) {
      throw new NotFoundException(
        `Program with ID "${id}" not found to update.`,
      );
    }

    // Program name cannot be changed after creation to maintain levels integrity.
    // If updateProgramDto included 'name', we would ignore it or throw an error.
    // Here, 'name' is not part of UpdateProgramDto, so we preserve program.name.

    let newLevels = updateProgramDto.levels;

    if (program.name === 'Dancers') {
      // If it's a Dancers program, levels are expected. If dto.levels is undefined, it means no change to levels.
      // If dto.levels is an empty array, it means clear levels, which is a valid update for Dancers (though UI might prevent).
      // The DTO validation ensures if levels are provided, they are valid DancerLevelNames.
      // Frontend form makes sure levels are provided if it is Dancers program
      if (updateProgramDto.levels === undefined) {
        // No change intended for levels
        newLevels = program.levels;
      } else if (
        updateProgramDto.levels !== undefined &&
        updateProgramDto.levels.length === 0
      ) {
        // Explicitly setting levels to empty for Dancers program might be disallowed by some business rules
        // For now, allow it if DTO passes an empty array.
        // If "at least one level required" for Dancers on update, add validation here.
        // For now, matching frontend logic which relies on CreateProgramDto validation for this.
      }
    } else {
      // For non-Dancers programs, levels should always be undefined.
      newLevels = undefined;
    }

    const updatedProgramPartial = await this.programRepository.preload({
      id: id,
      ageRange: updateProgramDto.ageRange, // Only update ageRange and levels
      levels: newLevels,
      // name is intentionally omitted to prevent change
    });

    if (!updatedProgramPartial) {
      throw new NotFoundException(
        `Program with ID "${id}" could not be preloaded for update.`,
      );
    }
    // Merge updates: only ageRange and levels. Name is preserved.
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

  async remove(id: string): Promise<void> {
    // Future enhancement: Check if program is associated with any ClassOfferings before deletion.
    const result = await this.programRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Program with ID "${id}" not found to delete`,
      );
    }
  }
}
