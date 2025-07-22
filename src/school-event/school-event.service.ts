// ballet-school-backend/src/school-event/school-event.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SchoolEvent } from './school-event.entity';
import { CreateSchoolEventDto, UpdateSchoolEventDto } from './dto';

@Injectable()
export class SchoolEventService {
  constructor(
    @InjectRepository(SchoolEvent)
    private schoolEventRepository: Repository<SchoolEvent>,
  ) {}

  async create(
    createSchoolEventDto: CreateSchoolEventDto,
  ): Promise<SchoolEvent> {
    const newEvent = this.schoolEventRepository.create(createSchoolEventDto);
    return this.schoolEventRepository.save(newEvent);
  }

  async findAll(month?: number, year?: number): Promise<SchoolEvent[]> {
    if (month && year) {
      // Month is 1-indexed from query, TypeORM works with string dates for Between
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      // To get the end date, go to the next month and get the 0th day (which is the last day of current month)
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const lastDayOfMonth = new Date(nextYear, nextMonth - 1, 0).getDate(); // month for Date is 0-indexed
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

      return this.schoolEventRepository.find({
        where: {
          date: Between(startDate, endDate),
        },
        order: { date: 'ASC' },
      });
    }
    return this.schoolEventRepository.find({ order: { date: 'ASC' } });
  }

  async findOne(id: string): Promise<SchoolEvent | null> {
    return this.schoolEventRepository.findOneBy({ id });
  }

  async update(
    id: string,
    updateSchoolEventDto: UpdateSchoolEventDto,
  ): Promise<SchoolEvent | null> {
    const event = await this.schoolEventRepository.preload({
      id,
      ...updateSchoolEventDto,
    });
    if (!event) {
      return null; // Controller will throw NotFoundException
    }
    return this.schoolEventRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    await this.schoolEventRepository.delete(id);
    // TypeORM delete does not throw error if not found, just affects 0 rows.
    // Controller should check existence before calling remove if specific 404 is needed for delete.
  }
}
