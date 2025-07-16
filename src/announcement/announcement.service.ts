// ballet-school-backend/src/announcement/announcement.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Announcement } from './announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepository: Repository<Announcement>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(
    createAnnouncementDto: CreateAnnouncementDto,
    user: Partial<AdminUser>,
  ): Promise<Announcement> {
    const studioId = user.studioId;
    if (!studioId) {
      throw new BadRequestException('User is not associated with a studio.');
    }
    const newAnnouncement: Announcement = this.announcementRepository.create({
      ...createAnnouncementDto,
      studioId,
    });
    const savedAnnouncement =
      await this.announcementRepository.save(newAnnouncement);

    this.notificationGateway.sendNotificationToStudio(studioId, {
      title: `New Announcement: ${savedAnnouncement.title.substring(0, 30)}...`,
      message: `Category: ${savedAnnouncement.category}. Click to view details.`,
      type: savedAnnouncement.isImportant ? 'warning' : 'info',
      link: '/communications',
    });

    return savedAnnouncement;
  }

  async findAll(user: Partial<AdminUser>): Promise<Announcement[]> {
    return this.announcementRepository.find({
      where: { studioId: user.studioId },
      order: {
        date: 'DESC',
        isImportant: 'DESC',
      },
    });
  }

  async findOne(
    id: string,
    user: Partial<AdminUser>,
  ): Promise<Announcement | null> {
    const announcement = await this.announcementRepository.findOneBy({
      id,
      studioId: user.studioId,
    });
    return announcement;
  }

  async update(
    id: string,
    updateAnnouncementDto: UpdateAnnouncementDto,
    user: Partial<AdminUser>,
  ): Promise<Announcement | null> {
    const announcement = await this.announcementRepository.preload({
      id: id,
      ...updateAnnouncementDto,
    });
    if (!announcement || announcement.studioId !== user.studioId) {
      return null;
    }
    return this.announcementRepository.save(announcement);
  }

  async remove(id: string, user: Partial<AdminUser>): Promise<void> {
    await this.announcementRepository.delete({ id, studioId: user.studioId });
  }
}
