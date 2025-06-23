/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/student/student.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity'; // Corrected path
import { CreateStudentDto, UpdateStudentDto } from './dto';

// Helper type for user data without password and internal methods
export type SafeStudent = Omit<
  Student,
  'password' | 'validatePassword' | 'hashPassword'
>;

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  private transformToSafeStudent(student: Student): SafeStudent {
    const { password, validatePassword, hashPassword, ...safeStudent } =
      student;
    return safeStudent;
  }

  private transformToSafeStudents(students: Student[]): SafeStudent[] {
    return students.map((student) => this.transformToSafeStudent(student));
  }

  async create(createStudentDto: CreateStudentDto): Promise<SafeStudent> {
    const { email, username } = createStudentDto;

    if (email) {
      const existingByEmail = await this.studentRepository.findOne({
        where: { email },
      });
      if (existingByEmail) {
        throw new ConflictException(`Email "${email}" already exists.`);
      }
    }
    if (username) {
      const existingByUsername = await this.studentRepository.findOne({
        where: { username },
      });
      if (existingByUsername) {
        throw new ConflictException(`Username "${username}" already exists.`);
      }
    }

    try {
      const newStudent = this.studentRepository.create(createStudentDto);
      // Password hashing will be handled by the @BeforeInsert hook in the entity
      const savedStudent = (await this.studentRepository.save(
        newStudent,
      )) as unknown as Student; // Corrected cast
      return this.transformToSafeStudent(savedStudent);
    } catch (error) {
      // Catch potential DB constraint errors not caught by prior checks
      if (error.code === '23505') {
        // PostgreSQL unique violation
        throw new ConflictException(
          'Username or email already exists (database constraint).',
        );
      }
      console.error('Error creating student:', error);
      throw new InternalServerErrorException('Could not create student.');
    }
  }

  async findAll(): Promise<SafeStudent[]> {
    const students = await this.studentRepository.find({
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
    return this.transformToSafeStudents(students);
  }

  async findOne(id: string): Promise<SafeStudent | null> {
    const student = await this.studentRepository.findOneBy({ id });
    if (!student) {
      return null; // Keep consistent with original service's null return
    }
    return this.transformToSafeStudent(student);
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<SafeStudent | null> {
    const studentToUpdate = await this.studentRepository.findOneBy({ id });
    if (!studentToUpdate) {
      return null;
    }

    // Check for uniqueness if email or username are being changed
    if (
      updateStudentDto.email &&
      updateStudentDto.email !== studentToUpdate.email
    ) {
      const existingByEmail = await this.studentRepository.findOne({
        where: { email: updateStudentDto.email },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `Email "${updateStudentDto.email}" already exists.`,
        );
      }
    }
    if (
      updateStudentDto.username &&
      updateStudentDto.username !== studentToUpdate.username
    ) {
      const existingByUsername = await this.studentRepository.findOne({
        where: { username: updateStudentDto.username },
      });
      if (existingByUsername) {
        throw new ConflictException(
          `Username "${updateStudentDto.username}" already exists.`,
        );
      }
    }

    // Merge existing student with DTO.
    // `preload` handles this well. If DTO has password, entity's hook will hash it.
    const updatedStudentPartial = await this.studentRepository.preload({
      id: id,
      ...updateStudentDto,
    });

    if (!updatedStudentPartial) {
      // This case should ideally not be hit if studentToUpdate was found,
      // but as a safeguard.
      throw new NotFoundException(
        `Student with ID "${id}" could not be preloaded for update.`,
      );
    }

    try {
      const savedStudent = await this.studentRepository.save(
        updatedStudentPartial,
      );
      return this.transformToSafeStudent(savedStudent);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Update would result in duplicate username or email (database constraint).',
        );
      }
      console.error('Error updating student:', error);
      throw new InternalServerErrorException('Could not update student.');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.studentRepository.delete(id);
    if (result.affected === 0) {
      // Keep consistent with original service
    }
  }
}
