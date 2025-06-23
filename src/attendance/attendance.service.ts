// src/attendance/attendance.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AttendanceRecord } from './attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { Student } from 'src/student/student.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ClassOffering)
    private classOfferingRepository: Repository<ClassOffering>,
  ) {}

  async findByClassAndDate(
    classOfferingId: string,
    date: string,
  ): Promise<AttendanceRecord[]> {
    // Find records where classDateTime starts with the given date "YYYY-MM-DD"
    return this.attendanceRepository.find({
      where: {
        classOfferingId,
        classDateTime: Like(`${date}%`), // Matches "YYYY-MM-DD HH:mm"
      },
      relations: ['student'], // Optionally load student details
    });
  }

  async upsertAttendance(dto: CreateAttendanceDto): Promise<AttendanceRecord> {
    // Check if student and class offering exist
    const student = await this.studentRepository.findOneBy({
      id: dto.studentId,
    });
    if (!student) {
      throw new NotFoundException(
        `Student with ID "${dto.studentId}" not found.`,
      );
    }
    const classOffering = await this.classOfferingRepository.findOneBy({
      id: dto.classOfferingId,
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
      },
    });

    if (record) {
      // Update existing record
      record.status = dto.status;
      record.notes = dto.notes;
      record.absenceId = dto.absenceId; // Allow updating absenceId link
    } else {
      // Create new record
      record = this.attendanceRepository.create(dto);
    }
    return this.attendanceRepository.save(record);
  }

  async bulkUpsertAttendance(
    recordsDto: CreateAttendanceDto[],
  ): Promise<AttendanceRecord[]> {
    const results: AttendanceRecord[] = [];
    for (const dto of recordsDto) {
      // Basic validation for student and class offering can be done here if needed,
      // or rely on individual upsertAttendance to throw if an ID is invalid.
      // For bulk operations, it might be better to pre-validate all student/class IDs.
      results.push(await this.upsertAttendance(dto));
    }
    return results;
  }

  async findOne(id: string): Promise<AttendanceRecord> {
    const record = await this.attendanceRepository.findOne({
      where: { id },
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
