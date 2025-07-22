// ballet-school-backend/src/absence/absence.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Absence } from './absence.entity';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto';
import { NotificationGateway } from 'src/notification/notification.gateway';

@Injectable()
export class AbsenceService {
  constructor(
    @InjectRepository(Absence)
    private absenceRepository: Repository<Absence>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(createAbsenceDto: CreateAbsenceDto): Promise<Absence> {
    const newAbsence = this.absenceRepository.create(createAbsenceDto);
    const savedAbsence = await this.absenceRepository.save(newAbsence);

    this.notificationGateway.sendNotificationToAll({
      title: 'Absence Recorded',
      message: `${savedAbsence.studentName} will be absent from ${savedAbsence.className}.`,
      type: 'info',
      link: `/enrollments/class/${savedAbsence.classId}`,
    });

    return savedAbsence;
  }

  async findAll(): Promise<Absence[]> {
    return this.absenceRepository.find({ order: { notificationDate: 'DESC' } });
  }

  async findAllByStudent(studentId: string, date?: string): Promise<Absence[]> {
    const whereClause: any = { studentId };
    if (date) {
      // This will filter by YYYY-MM-DD if a full date is given,
      // or by YYYY-MM if only month is given (e.g., '2024-07')
      // because classDateTime is stored as "YYYY-MM-DD HH:MM..."
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      whereClause.classDateTime = Like(`${date}%`);
    }
    return this.absenceRepository.find({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: whereClause,
      order: { notificationDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Absence | null> {
    const absence = await this.absenceRepository.findOneBy({ id });
    return absence;
  }

  async update(
    id: string,
    updateAbsenceDto: UpdateAbsenceDto,
  ): Promise<Absence | null> {
    const absence = await this.absenceRepository.preload({
      id: id,
      ...updateAbsenceDto,
    });
    if (!absence) {
      return null; // Controller will handle NotFoundException
    }
    return this.absenceRepository.save(absence);
  }

  async remove(id: string): Promise<void> {
    const result = await this.absenceRepository.delete(id);
    if (result.affected === 0) {
      // Could throw new NotFoundException if needed
    }
  }
}
