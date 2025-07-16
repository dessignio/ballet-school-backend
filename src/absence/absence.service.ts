/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// ballet-school-backend/src/absence/absence.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Absence } from './absence.entity';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class AbsenceService {
  constructor(
    @InjectRepository(Absence)
    private absenceRepository: Repository<Absence>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(
    createAbsenceDto: CreateAbsenceDto,
    user: Partial<AdminUser>,
  ): Promise<Absence> {
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }
    const newAbsence = this.absenceRepository.create({
      ...createAbsenceDto,
      studioId,
    });
    const savedAbsence = await this.absenceRepository.save(newAbsence);

    this.notificationGateway.sendNotificationToStudio(studioId, {
      title: 'Absence Recorded',
      message: `${savedAbsence.studentName} will be absent from ${savedAbsence.className}.`,
      type: 'info',
      link: `/enrollments/class/${savedAbsence.classId}`,
    });

    return savedAbsence;
  }

  async findAll(user: Partial<AdminUser>): Promise<Absence[]> {
    return this.absenceRepository.find({
      where: { studioId: user.studioId },
      order: { notificationDate: 'DESC' },
    });
  }

  async findAllByStudent(
    studentId: string,
    user: Partial<AdminUser>,
    date?: string,
  ): Promise<Absence[]> {
    const whereClause: any = { studentId, studioId: user.studioId };
    if (date) {
      whereClause.classDateTime = Like(`${date}%`);
    }
    return this.absenceRepository.find({
      where: whereClause,
      order: { notificationDate: 'DESC' },
    });
  }

  async findOne(id: string, user: Partial<AdminUser>): Promise<Absence | null> {
    const absence = await this.absenceRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    return absence;
  }

  async update(
    id: string,
    updateAbsenceDto: UpdateAbsenceDto,
    user: Partial<AdminUser>,
  ): Promise<Absence | null> {
    const absence = await this.absenceRepository.preload({
      id: id,
      ...updateAbsenceDto,
    });
    if (!absence || absence.studioId !== user.studioId) {
      return null;
    }
    return this.absenceRepository.save(absence);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    await this.absenceRepository.delete({ id, studioId: user.studioId });
  }
}
