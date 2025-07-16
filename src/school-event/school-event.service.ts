// ballet-school-backend/src/school-event/school-event.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// CORRECCIÓN: Importar 'Between' y 'FindOptionsWhere' de typeorm
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { SchoolEvent } from './school-event.entity';
import { CreateSchoolEventDto, UpdateSchoolEventDto } from './dto';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class SchoolEventService {
  constructor(
    @InjectRepository(SchoolEvent)
    private schoolEventRepository: Repository<SchoolEvent>,
  ) {}

  async create(
    createSchoolEventDto: CreateSchoolEventDto,
    user: Partial<AdminUser>,
  ): Promise<SchoolEvent> {
    const newEvent = this.schoolEventRepository.create({
      ...createSchoolEventDto,
      studioId: user.studioId,
    });
    return this.schoolEventRepository.save(newEvent);
  }

  async findAll(
    // CORRECCIÓN 1: 'user' ahora es requerido, ya no tiene '?'
    user: Partial<AdminUser>,
    month?: number,
    year?: number,
  ): Promise<SchoolEvent[]> {
    // CORRECCIÓN 2: Usamos un tipo seguro en lugar de 'any'
    const whereClause: FindOptionsWhere<SchoolEvent> = {
      studioId: user.studioId,
    };

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const lastDayOfMonth = new Date(nextYear, nextMonth - 1, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      // Ya no hay error de 'unsafe access' porque 'whereClause' está bien tipado
      whereClause.date = Between(startDate, endDate);
    }

    return this.schoolEventRepository.find({
      where: whereClause,
      order: { date: 'ASC' },
    });
  }

  // CORRECCIÓN 3: Se aplica el formato de Prettier
  async findOne(
    id: string,
    user: Partial<AdminUser>,
  ): Promise<SchoolEvent | null> {
    return this.schoolEventRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
  }

  async update(
    id: string,
    updateSchoolEventDto: UpdateSchoolEventDto,
    user: Partial<AdminUser>,
  ): Promise<SchoolEvent | null> {
    const event = await this.schoolEventRepository.preload({
      id,
      ...updateSchoolEventDto,
      studioId: user.studioId,
    });
    if (!event) {
      return null;
    }
    return this.schoolEventRepository.save(event);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    await this.schoolEventRepository.delete({ id, studioId: user.studioId });
  }
}
