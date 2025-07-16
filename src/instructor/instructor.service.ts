// src/instructor/instructor.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instructor } from './instructor.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(Instructor)
    private instructorRepository: Repository<Instructor>,
  ) {}

  async create(
    createInstructorDto: CreateInstructorDto,
    user: Partial<AdminUser>,
  ): Promise<Instructor> {
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }
    const newInstructor = this.instructorRepository.create({
      ...createInstructorDto,
      studioId,
    });
    return this.instructorRepository.save(newInstructor);
  }

  async findAll(user: Partial<AdminUser>): Promise<Instructor[]> {
    return this.instructorRepository.find({
      where: { studioId: user.studioId },
    });
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor with ID "${id}" not found`);
    }
    return instructor;
  }

  async update(
    id: string,
    updateInstructorDto: UpdateInstructorDto,
    user: Partial<AdminUser>,
  ): Promise<Instructor> {
    const instructor = await this.instructorRepository.preload({
      id: id,
      ...updateInstructorDto,
    });
    if (!instructor || instructor.studioId !== user.studioId) {
      throw new NotFoundException(
        `Instructor with ID "${id}" not found to update`,
      );
    }
    return this.instructorRepository.save(instructor);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const result = await this.instructorRepository.delete({
      id,
      studioId: user.studioId,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Instructor with ID "${id}" not found to delete`,
      );
    }
  }
}
