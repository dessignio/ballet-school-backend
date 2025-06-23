// ballet-school-backend/src/announcement/announcement.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
// Changed import paths:
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './announcement.entity';

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
  ): Promise<Announcement> {
    return this.announcementService.create(createAnnouncementDto);
  }

  @Get()
  async findAll(): Promise<Announcement[]> {
    return this.announcementService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Announcement> {
    const announcement = await this.announcementService.findOne(id);
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }
    return announcement;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ): Promise<Announcement> {
    const updatedAnnouncement = await this.announcementService.update(
      id,
      updateAnnouncementDto,
    );
    if (!updatedAnnouncement) {
      throw new NotFoundException(
        `Announcement with ID "${id}" not found to update`,
      );
    }
    return updatedAnnouncement;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const announcement = await this.announcementService.findOne(id);
    if (!announcement) {
      throw new NotFoundException(
        `Announcement with ID "${id}" not found to delete`,
      );
    }
    await this.announcementService.remove(id);
  }
}
