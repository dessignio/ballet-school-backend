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
  UseGuards,
  Req,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './announcement.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  async create(
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Req() req: Request,
  ): Promise<Announcement> {
    // Aserción de tipo para confirmar a TypeScript que req.user es válido
    return this.announcementService.create(
      createAnnouncementDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  async findAll(@Req() req: Request): Promise<Announcement[]> {
    return this.announcementService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<Announcement> {
    const announcement = await this.announcementService.findOne(
      id,
      req.user as Partial<AdminUser>,
    );
    if (!announcement) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }
    return announcement;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Req() req: Request,
  ): Promise<Announcement> {
    const updatedAnnouncement = await this.announcementService.update(
      id,
      updateAnnouncementDto,
      req.user as Partial<AdminUser>,
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
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.announcementService.remove(id, req.user as Partial<AdminUser>);
  }
}
