// src/student/student.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './student.entity';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';

// Define un tipo seguro para el estudiante, excluyendo la contraseña y los métodos internos.
export type SafeStudent = Omit<
  Student,
  'password' | 'validatePassword' | 'hashPassword'
>;

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MembershipPlanDefinitionEntity)
    private membershipPlanRepository: Repository<MembershipPlanDefinitionEntity>,
  ) {}

  // --- MÉTODOS PRIVADOS DE AYUDA ---

  private transformToSafeStudent(student: Student): SafeStudent {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeStudent } = student;
    return safeStudent;
  }

  private transformToSafeStudents(students: Student[]): SafeStudent[] {
    return students.map((student) => this.transformToSafeStudent(student));
  }

  private calculateRenewalDate(
    startDateString: string,
    durationMonths?: number | null,
  ): string | null {
    const startDate = new Date(startDateString);
    if (isNaN(startDate.getTime())) return null;

    // Se usa getUTCDate para evitar problemas con zonas horarias
    const renewalDate = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );

    const duration = durationMonths && durationMonths > 0 ? durationMonths : 1;
    renewalDate.setUTCMonth(renewalDate.getUTCMonth() + duration);
    return renewalDate.toISOString().split('T')[0];
  }

  // --- MÉTODOS CRUD ---

  async create(createStudentDto: CreateStudentDto): Promise<SafeStudent> {
    const { email, username, membershipPlanId, membershipStartDate } =
      createStudentDto;

    // Verificación de conflictos
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

    const newStudent = this.studentRepository.create(createStudentDto);

    if (membershipPlanId) {
      const plan = await this.membershipPlanRepository.findOneBy({
        id: membershipPlanId,
      });
      if (!plan) {
        throw new BadRequestException(
          `Membership plan with ID "${membershipPlanId}" not found.`,
        );
      }
      // Asignamos las propiedades del plan al nuevo estudiante
      newStudent.membershipType = plan.name;
      newStudent.membershipPlanName = plan.name;
      const actualStartDate =
        membershipStartDate || new Date().toISOString().split('T')[0];
      newStudent.membershipStartDate = actualStartDate;
      newStudent.membershipRenewalDate = this.calculateRenewalDate(
        actualStartDate,
        plan.durationMonths,
      );
    }

    try {
      const savedStudent = await this.studentRepository.save(newStudent);
      return this.transformToSafeStudent(savedStudent);
    } catch (error) {
      if ((error as { code: string }).code === '23505') {
        throw new ConflictException('Username or email already exists.');
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

  async findOne(id: string): Promise<SafeStudent> {
    const student = await this.studentRepository.findOneBy({ id });
    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found.`);
    }
    return this.transformToSafeStudent(student);
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<SafeStudent> {
    const studentToUpdate = await this.studentRepository.preload({
      id: id,
      ...updateStudentDto,
    });

    if (!studentToUpdate) {
      throw new NotFoundException(`Student with ID "${id}" not found.`);
    }

    const { membershipPlanId, membershipStartDate } = updateStudentDto;

    if (membershipPlanId !== undefined) {
      if (membershipPlanId === null) {
        studentToUpdate.membershipPlanId = null;
        studentToUpdate.membershipType = null;
        studentToUpdate.membershipPlanName = undefined;
        studentToUpdate.membershipStartDate = null;
        studentToUpdate.membershipRenewalDate = null;
      } else {
        const plan = await this.membershipPlanRepository.findOneBy({
          id: membershipPlanId,
        });
        if (!plan) {
          throw new BadRequestException(
            `Membership plan with ID "${membershipPlanId}" not found.`,
          );
        }
        studentToUpdate.membershipPlanId = plan.id;
        studentToUpdate.membershipType = plan.name;
        studentToUpdate.membershipPlanName = plan.name;
        const actualStartDate =
          membershipStartDate ||
          studentToUpdate.membershipStartDate ||
          new Date().toISOString().split('T')[0];
        studentToUpdate.membershipStartDate = actualStartDate;
        studentToUpdate.membershipRenewalDate = this.calculateRenewalDate(
          actualStartDate,
          plan.durationMonths,
        );
      }
    } else if (membershipStartDate && studentToUpdate.membershipPlanId) {
      const plan = await this.membershipPlanRepository.findOneBy({
        id: studentToUpdate.membershipPlanId,
      });
      if (plan) {
        studentToUpdate.membershipStartDate = membershipStartDate;
        studentToUpdate.membershipRenewalDate = this.calculateRenewalDate(
          membershipStartDate,
          plan.durationMonths,
        );
      }
    }

    try {
      const savedStudent = await this.studentRepository.save(studentToUpdate);
      return this.transformToSafeStudent(savedStudent);
    } catch (error) {
      if ((error as { code: string }).code === '23505') {
        throw new ConflictException(
          'Update would result in duplicate username or email.',
        );
      }
      console.error('Error updating student:', error);
      throw new InternalServerErrorException('Could not update student.');
    }
  }

  async remove(id: string): Promise<void> {
    const result = await this.studentRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Student with ID "${id}" not found to delete.`,
      );
    }
  }
}
