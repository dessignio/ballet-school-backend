// src/attendance/attendance.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { Student } from 'src/student/student.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ClassOffering)
    private classOfferingRepository: Repository<ClassOffering>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async findByClassAndDate(
    classOfferingId: string,
    date: string,
    user: Partial<AdminUser>,
  ): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return this.attendanceRepository.find({
      where: {
        classOfferingId,
        studioId: user.studioId,
        classDateTime: Between(
          startOfDay.toISOString(),
          endOfDay.toISOString(),
        ),
      },
      relations: ['student'],
    });
  }

  async upsertAttendance(
    dto: CreateAttendanceDto,
    user: Partial<AdminUser>,
  ): Promise<AttendanceRecord> {
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }

    const student = await this.studentRepository.findOneBy({
      id: dto.studentId,
      studioId,
    });
    if (!student) {
      throw new NotFoundException(
        `Student with ID "${dto.studentId}" not found.`,
      );
    }
    const classOffering = await this.classOfferingRepository.findOneBy({
      id: dto.classOfferingId,
      studioId,
    });
    if (!classOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${dto.classOfferingId}" not found.`,
      );
    }

    let record = await this.attendanceRepository.findOne({
      where: {
        studentId: dto.studentId,
        classOfferingId: dto.classOfferingId,
        classDateTime: dto.classDateTime,
        studioId,
      },
    });

    if (record) {
      record.status = dto.status;
      record.notes = dto.notes;
      record.absenceId = dto.absenceId;
    } else {
      record = this.attendanceRepository.create({ ...dto, studioId });
    }
    const savedRecord = await this.attendanceRepository.save(record);

    this.notificationGateway.sendNotificationToStudio(studioId, {
      title: 'Attendance Update',
      message: `${student.firstName} ${student.lastName} was marked as ${savedRecord.status} for ${classOffering.name}.`,
      type: 'info',
      link: `/enrollments/class/${dto.classOfferingId}`,
    });

    return savedRecord;
  }

  async bulkUpsertAttendance(
    recordsDto: CreateAttendanceDto[],
    user: Partial<AdminUser>,
  ): Promise<AttendanceRecord[]> {
    const results: AttendanceRecord[] = [];
    for (const dto of recordsDto) {
      results.push(await this.upsertAttendance(dto, user));
    }
    return results;
  }

  async findOne(
    id: string,
    user: Partial<AdminUser>,
  ): Promise<AttendanceRecord> {
    const record = await this.attendanceRepository.findOne({
      where: { id, studioId: user.studioId },
      relations: ['student', 'classOffering', 'absence'],
    });
    if (!record) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
    return record;
  }
}
