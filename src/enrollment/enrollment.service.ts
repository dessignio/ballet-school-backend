/* eslint-disable @typescript-eslint/no-unused-vars */
// src/enrollment/enrollment.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { ClassOffering } from 'src/class-offering/class-offering.entity';
import { Student } from 'src/student/student.entity'; // Import Student entity
import { NotificationGateway } from 'src/notification/notification.gateway';

export interface MappedEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  classOfferingId: string;
  classOfferingName: string;
  enrollmentDate: string;
  status: string;
  waitlistPosition?: number | null;
}

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(ClassOffering)
    private classOfferingRepository: Repository<ClassOffering>,
    @InjectRepository(Student) // Inject StudentRepository
    private studentRepository: Repository<Student>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  private async mapEnrollmentToDto(
    enrollment: Enrollment,
  ): Promise<MappedEnrollment> {
    // Ensure relations are loaded if not already
    const e =
      enrollment.student && enrollment.classOffering
        ? enrollment
        : await this.enrollmentRepository.findOne({
            where: { id: enrollment.id },
            relations: ['student', 'classOffering'],
          });
    if (!e)
      throw new NotFoundException('Enrollment data incomplete for mapping');

    return {
      id: e.id,
      studentId: e.studentId,
      studentName: e.student
        ? `${e.student.firstName} ${e.student.lastName}`
        : 'N/A',
      classOfferingId: e.classOfferingId,
      classOfferingName: e.classOffering ? e.classOffering.name : 'N/A',
      enrollmentDate: e.enrollmentDate,
      status: e.status,
      waitlistPosition: e.waitlistPosition,
    };
  }

  async create(
    createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<MappedEnrollment> {
    const { studentId, classOfferingId, status } = createEnrollmentDto;

    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { studentId, classOfferingId },
    });
    if (existingEnrollment) {
      throw new ConflictException(
        `Student is already processed for this class (status: ${existingEnrollment.status}).`,
      );
    }

    const classOffering = await this.classOfferingRepository.findOneBy({
      id: classOfferingId,
    });
    if (!classOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${classOfferingId}" not found.`,
      );
    }

    if (status === 'Enrolled') {
      if (classOffering.enrolledCount >= classOffering.capacity) {
        throw new ConflictException(
          'Class is full. Cannot enroll directly. Consider waitlisting.',
        );
      }
    }

    const enrollment = this.enrollmentRepository.create({
      ...createEnrollmentDto,
      enrollmentDate:
        createEnrollmentDto.enrollmentDate ||
        new Date().toISOString().split('T')[0],
    });

    const savedEnrollment = await this.enrollmentRepository.save(enrollment);

    if (savedEnrollment.status === 'Enrolled') {
      const newEnrolledCount = (classOffering.enrolledCount || 0) + 1;
      classOffering.enrolledCount = newEnrolledCount;
      await this.classOfferingRepository.save(classOffering);

      if (newEnrolledCount === classOffering.capacity) {
        this.notificationGateway.sendNotificationToAll({
          title: 'Class Full',
          message: `Class "${classOffering.name}" has reached maximum capacity.`,
          type: 'warning',
          link: `/enrollments/class/${classOffering.id}`,
        });
      }

      // Update student's enrolledClasses
      const student = await this.studentRepository.findOneBy({ id: studentId });
      if (student) {
        if (!Array.isArray(student.enrolledClasses)) {
          student.enrolledClasses = [];
        }
        if (!student.enrolledClasses.includes(classOfferingId)) {
          student.enrolledClasses.push(classOfferingId);
          await this.studentRepository.save(student);
        }
      } else {
        console.warn(
          `Student with ID "${studentId}" not found during enrollment post-processing for create.`,
        );
      }
    }

    this.notificationGateway.broadcastDataUpdate('enrollments', {
      classOfferingId,
    });
    this.notificationGateway.broadcastDataUpdate('classOfferings', {
      updatedId: classOfferingId,
    });

    return this.mapEnrollmentToDto(savedEnrollment);
  }

  async findAllByCriteria(
    classOfferingId?: string,
    studentId?: string,
  ): Promise<MappedEnrollment[]> {
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.classOffering', 'classOffering')
      .orderBy('student.lastName', 'ASC')
      .addOrderBy('student.firstName', 'ASC');

    if (classOfferingId) {
      queryBuilder.where('enrollment.classOfferingId = :classOfferingId', {
        classOfferingId,
      });
    }
    if (studentId) {
      const condition = classOfferingId
        ? 'enrollment.studentId = :studentId'
        : 'enrollment.studentId = :studentId';
      queryBuilder[classOfferingId ? 'andWhere' : 'where'](condition, {
        studentId,
      });
    }

    const enrollments = await queryBuilder.getMany();
    return Promise.all(enrollments.map((e) => this.mapEnrollmentToDto(e)));
  }

  async findOne(id: string): Promise<MappedEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id },
      relations: ['student', 'classOffering'],
    });
    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID "${id}" not found.`);
    }
    return this.mapEnrollmentToDto(enrollment);
  }

  async update(
    id: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<MappedEnrollment> {
    const enrollment = await this.enrollmentRepository.findOneBy({ id });
    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment with ID "${id}" not found to update.`,
      );
    }
    // Note: Complex status transition logic (e.g., enrolledCount, student.enrolledClasses)
    // would need to be handled here if status changes.
    // For now, this is a simple field update.

    Object.assign(enrollment, updateEnrollmentDto);
    const updatedEnrollment = await this.enrollmentRepository.save(enrollment);
    return this.mapEnrollmentToDto(updatedEnrollment);
  }

  async removeByStudentAndClass(
    studentId: string,
    classOfferingId: string,
  ): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { studentId, classOfferingId },
    });
    if (!enrollment) {
      throw new NotFoundException(
        'Enrollment not found for this student and class.',
      );
    }

    const wasEnrolled = enrollment.status === 'Enrolled';
    await this.enrollmentRepository.remove(enrollment);

    if (wasEnrolled) {
      const classOffering = await this.classOfferingRepository.findOneBy({
        id: classOfferingId,
      });
      if (classOffering && classOffering.enrolledCount > 0) {
        classOffering.enrolledCount -= 1;
        await this.classOfferingRepository.save(classOffering);
      }

      // Update student's enrolledClasses
      const student = await this.studentRepository.findOneBy({ id: studentId });
      if (student) {
        if (Array.isArray(student.enrolledClasses)) {
          student.enrolledClasses = student.enrolledClasses.filter(
            (id) => id !== classOfferingId,
          );
          await this.studentRepository.save(student);
        }
      } else {
        console.warn(
          `Student with ID "${studentId}" not found during enrollment post-processing for remove.`,
        );
      }
    }

    this.notificationGateway.broadcastDataUpdate('enrollments', {
      classOfferingId,
    });
    this.notificationGateway.broadcastDataUpdate('classOfferings', {
      updatedId: classOfferingId,
    });
  }
}
