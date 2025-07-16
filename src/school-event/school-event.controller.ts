// ballet-school-backend/src/school-event/school-event.controller.ts
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
  Query,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SchoolEventService } from './school-event.service';
import { CreateSchoolEventDto, UpdateSchoolEventDto } from './dto';
import { SchoolEvent } from './school-event.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Controller('school-events')
@UseGuards(JwtAuthGuard)
export class SchoolEventController {
  constructor(private readonly schoolEventService: SchoolEventService) {}

  @Post()
  async create(
    @Body() createSchoolEventDto: CreateSchoolEventDto,
    @Req() req: Request,
  ): Promise<SchoolEvent> {
    return this.schoolEventService.create(
      createSchoolEventDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  // CORRECCIÓN 1: Se reordenan los parámetros. @Req va antes que los @Query opcionales.
  async findAll(
    @Req() req: Request,
    @Query('month') monthStr?: string,
    @Query('year') yearStr?: string,
  ): Promise<SchoolEvent[]> {
    let month: number | undefined;
    let year: number | undefined;

    if (monthStr) {
      month = parseInt(monthStr, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new BadRequestException(
          'Invalid month. Must be between 1 and 12.',
        );
      }
    }
    if (yearStr) {
      year = parseInt(yearStr, 10);
      if (isNaN(year) || year < 1900 || year > 2200) {
        throw new BadRequestException(
          'Invalid year. Must be between 1900 and 2200.',
        );
      }
    }

    if ((month && !year) || (!month && year)) {
      throw new BadRequestException(
        'Both month and year must be provided if one is present for filtering, or neither to get all events.',
      );
    }

    // CORRECCIÓN 2: Se reordenan los argumentos para que coincidan con el servicio.
    return this.schoolEventService.findAll(
      req.user as Partial<AdminUser>,
      month,
      year,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<SchoolEvent> {
    const event = await this.schoolEventService.findOne(
      id,
      req.user as Partial<AdminUser>,
    );
    if (!event) {
      throw new NotFoundException(`SchoolEvent with ID "${id}" not found`);
    }
    return event;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSchoolEventDto: UpdateSchoolEventDto,
    @Req() req: Request,
  ): Promise<SchoolEvent> {
    const updatedEvent = await this.schoolEventService.update(
      id,
      updateSchoolEventDto,
      req.user as Partial<AdminUser>,
    );
    if (!updatedEvent) {
      throw new NotFoundException(
        `SchoolEvent with ID "${id}" not found to update`,
      );
    }
    return updatedEvent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    const event = await this.schoolEventService.findOne(
      id,
      req.user as Partial<AdminUser>,
    );
    if (!event) {
      throw new NotFoundException(
        `SchoolEvent with ID "${id}" not found to delete`,
      );
    }
    await this.schoolEventService.remove(id, req.user as Partial<AdminUser>);
    return;
  }
}
