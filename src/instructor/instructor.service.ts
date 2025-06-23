// src/instructor/instructor.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
  ) {}

  async create(createInstructorDto: CreateInstructorDto): Promise<Instructor> {
    const newInstructor = this.instructorRepository.create(createInstructorDto);
    return this.instructorRepository.save(newInstructor);
  }

  async findAll(): Promise<Instructor[]> {
    return this.instructorRepository.find();
  }

  async findOne(id: string): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOneBy({ id });
    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${id}" not found`);
    }
    return instructor;
  }

  async update(
    id: string,
    updateInstructorDto: UpdateInstructorDto,
  ): Promise<Instructor> {
    // The preload method creates a new entity based on the object passed into it.
    // It first checks if an entity with the given ID already exists in the database.
    // If it does, it loads it with all its existing properties, and then replaces
    // all properties with the new ones from updateInstructorDto.
    // If an entity with such ID does not exist, it returns undefined.
    const instructor = await this.instructorRepository.preload({
      id: id,
      ...updateInstructorDto,
    });
    if (!instructor) {
      throw new NotFoundException(
        `Instructor with ID "${id}" not found to update`,
      );
    }
    return this.instructorRepository.save(instructor);
  }

  async remove(id: string): Promise<void> {
    const result = await this.instructorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Instructor with ID "${id}" not found to delete`,
      );
    }
  }
}
