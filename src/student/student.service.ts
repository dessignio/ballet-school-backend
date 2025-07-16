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
import { NotificationGateway } from 'src/notification/notification.gateway';
import { Parent } from 'src/parent/parent.entity';
import { Enrollment } from 'src/enrollment/enrollment.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';
import { AdminUser } from 'src/admin-user/admin-user.entity';

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
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    private readonly notificationGateway: NotificationGateway,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ClassOffering)
    private classOfferingRepository: Repository<ClassOffering>,
  ) {}

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
    const startDate = new Date(`${startDateString}T00:00:00Z`);
    if (isNaN(startDate.getTime())) return null;
    const renewalDate = new Date(startDate.getTime());
    const duration = durationMonths && durationMonths > 0 ? durationMonths : 1;
    renewalDate.setUTCMonth(renewalDate.getUTCMonth() + duration);
    return renewalDate.toISOString().split('T')[0];
  }

  async findByUsername(
    username: string,
    studioId: string,
  ): Promise<Student | null> {
    return this.studentRepository
      .createQueryBuilder('student')
      .addSelect('student.password')
      .where('student.username = :username', { username })
      .andWhere('student.studioId = :studioId', { studioId })
      .getOne();
  }

  async create(
    createStudentDto: CreateStudentDto,
    user: Partial<AdminUser>,
  ): Promise<SafeStudent> {
    const { email, username, membershipPlanId, membershipStartDate, parentId } =
      createStudentDto;

    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }

    if (email) {
      const existingByEmail = await this.studentRepository.findOne({
        where: { email, studioId },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `Email "${email}" already exists in this studio.`,
        );
      }
    }
    if (username) {
      const existingByUsername = await this.studentRepository.findOne({
        where: { username, studioId },
      });
      if (existingByUsername) {
        throw new ConflictException(
          `Username "${username}" already exists in this studio.`,
        );
      }
    }

    const newStudent = this.studentRepository.create({
      ...createStudentDto,
      studioId,
    });

    if (parentId) {
      const parent = await this.parentRepository.findOneBy({
        id: parentId,
        studioId,
      });
      if (!parent) {
        throw new BadRequestException(
          `Parent with ID "${parentId}" not found in this studio.`,
        );
      }
      newStudent.parentName = `${parent.firstName} ${parent.lastName}`;
    }

    if (membershipPlanId) {
      const plan = await this.membershipPlanRepository.findOneBy({
        id: membershipPlanId,
        studioId,
      });
      if (!plan) {
        throw new BadRequestException(
          `Membership plan with ID "${membershipPlanId}" not found in this studio.`,
        );
      }
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
      this.notificationGateway.broadcastDataUpdate(
        'students',
        {
          createdId: savedStudent.id,
        },
        studioId,
      );
      return this.transformToSafeStudent(savedStudent);
    } catch (error) {
      if ((error as { code: string }).code === '23505') {
        throw new ConflictException('Username or email already exists.');
      }
      console.error('Error creating student:', error);
      throw new InternalServerErrorException('Could not create student.');
    }
  }

  async findAll(user: Partial<AdminUser>): Promise<SafeStudent[]> {
    const students = await this.studentRepository.find({
      where: { studioId: user.studioId },
      order: { lastName: 'ASC', firstName: 'ASC' },
      relations: ['parent'],
    });
    return this.transformToSafeStudents(students);
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<SafeStudent> {
    const student = await this.studentRepository.findOne({
      where: { id, studioId: user.studioId },
      relations: ['parent'],
    });
    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found.`);
    }
    return this.transformToSafeStudent(student);
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
    user: Partial<AdminUser>,
  ): Promise<SafeStudent> {
    const studioId = user.studioId; // Puede ser string | undefined
    const existingStudent = await this.studentRepository.findOneBy({
      id,
      studioId,
    });
    if (!existingStudent) {
      throw new NotFoundException(`Student with ID "${id}" not found.`);
    }
    const oldPlanId = existingStudent.membershipPlanId;
    const oldPlanName = existingStudent.membershipPlanName;

    const studentToUpdate = await this.studentRepository.preload({
      id: id,
      ...updateStudentDto,
    });

    if (!studentToUpdate) {
      throw new NotFoundException(`Student with ID "${id}" not found.`);
    }

    const { membershipPlanId, membershipStartDate, parentId } =
      updateStudentDto;

    if (parentId !== undefined) {
      if (parentId === null) {
        studentToUpdate.parentName = undefined;
      } else {
        const parent = await this.parentRepository.findOneBy({
          id: parentId,
          studioId,
        });
        if (!parent) {
          throw new BadRequestException(
            `Parent with ID "${parentId}" not found in this studio.`,
          );
        }
        studentToUpdate.parentName = `${parent.firstName} ${parent.lastName}`;
      }
    }

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
          studioId,
        });
        if (!plan) {
          throw new BadRequestException(
            `Membership plan with ID "${membershipPlanId}" not found in this studio.`,
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
        studioId,
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

      // CORRECCIÓN 1: Comprobar que studioId existe antes de usarlo para notificaciones
      if (studioId) {
        if (
          savedStudent.membershipPlanId &&
          savedStudent.membershipPlanId !== oldPlanId
        ) {
          this.notificationGateway.sendNotificationToStudio(studioId, {
            title: 'Membership Changed',
            message: `${savedStudent.firstName} ${savedStudent.lastName}'s membership changed to ${savedStudent.membershipPlanName || 'a new plan'}.`,
            type: 'info',
            link: `/billing`,
          });
        } else if (oldPlanId && !savedStudent.membershipPlanId) {
          this.notificationGateway.sendNotificationToStudio(studioId, {
            title: 'Membership Removed',
            message: `${savedStudent.firstName} ${savedStudent.lastName}'s membership plan (${oldPlanName}) was removed.`,
            type: 'info',
            link: `/billing`,
          });
        }

        this.notificationGateway.broadcastDataUpdate(
          'students',
          {
            updatedId: savedStudent.id,
          },
          studioId,
        );
      }

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

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    const student = await this.studentRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    if (!student) {
      throw new NotFoundException(
        `Student with ID "${id}" not found in this studio.`,
      );
    }

    const enrollments = await this.enrollmentRepository.find({
      where: { studentId: id, status: 'Enrolled' },
    });

    if (enrollments.length > 0) {
      const classIdsToUpdate = enrollments.map((e) => e.classOfferingId);
      for (const classId of classIdsToUpdate) {
        await this.classOfferingRepository.decrement(
          { id: classId, studioId: user.studioId },
          'enrolledCount',
          1,
        );
      }
    }

    const result = await this.studentRepository.delete({
      id,
      studioId: user.studioId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Student with ID "${id}" not found to delete.`,
      );
    }

    // CORRECCIÓN 2: Usar user.studioId y comprobar que existe
    if (user.studioId) {
      this.notificationGateway.broadcastDataUpdate(
        'students',
        { deletedId: id },
        user.studioId,
      );
      if (enrollments.length > 0) {
        this.notificationGateway.broadcastDataUpdate(
          'classOfferings',
          {
            type: 'bulk_update',
            ids: enrollments.map((e) => e.classOfferingId),
          },
          user.studioId,
        );
      }
    }
  }
}
