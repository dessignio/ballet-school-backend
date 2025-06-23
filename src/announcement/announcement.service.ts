// ballet-school-backend/src/announcement/announcement.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
// Changed import paths:
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
  ) {}

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
  ): Promise<Announcement> {
    // Added explicit type annotation for newAnnouncement
    const newAnnouncement: Announcement = this.announcementRepository.create(
      createAnnouncementDto,
    );
    return this.announcementRepository.save(newAnnouncement);
  }

  async findAll(): Promise<Announcement[]> {
    // Order by date descending (newest first), then by importance
    return this.announcementRepository.find({
      order: {
        date: 'DESC',
        isImportant: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Announcement | null> {
    const announcement = await this.announcementRepository.findOneBy({ id });
    // No NotFoundException here, controller can handle it or return null as needed.
    return announcement;
  }

  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<Announcement | null> {
    const announcement = await this.announcementRepository.preload({
      id: id,
      ...updateAnnouncementDto,
    });
    if (!announcement) {
      return null; // Let controller handle NotFound
    }
    return this.announcementRepository.save(announcement);
  }

  async remove(id: string): Promise<void> {
    const result = await this.announcementRepository.delete(id);
    if (result.affected === 0) {
      // No exception needed if not found, delete doesn't fail.
      // Controller can check existence if 404 on non-existent delete is desired.
    }
  }
}
