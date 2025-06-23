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
} from '@nestjs/common';
import { SchoolEventService } from './school-event.service';
import { CreateSchoolEventDto, UpdateSchoolEventDto } from './dto';
import { SchoolEvent } from './school-event.entity';

@Controller('school-events')
export class SchoolEventController {
  constructor(private readonly schoolEventService: SchoolEventService) {
    console.log(
      'SchoolEventController (Full Version from provided file) INSTANTIATED',
    );
  }

  @Post()
  async create(
    @Body() createSchoolEventDto: CreateSchoolEventDto,
  ): Promise<SchoolEvent> {
    return this.schoolEventService.create(createSchoolEventDto);
  }

  @Get()
  async findAll(
    @Query('month') monthStr?: string,
    @Query('year') yearStr?: string,
  ): Promise<SchoolEvent[]> {
    console.log(
      `SchoolEventController: findAll called with month=${monthStr}, year=${yearStr}`,
    );
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
      // Adjusted year range for more flexibility
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
    return this.schoolEventService.findAll(month, year);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SchoolEvent> {
    const event = await this.schoolEventService.findOne(id);
    if (!event) {
      throw new NotFoundException(`SchoolEvent with ID "${id}" not found`);
    }
    return event;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSchoolEventDto: UpdateSchoolEventDto,
  ): Promise<SchoolEvent> {
    const updatedEvent = await this.schoolEventService.update(
      id,
      updateSchoolEventDto,
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
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const event = await this.schoolEventService.findOne(id); // Check existence before delete
    if (!event) {
      throw new NotFoundException(
        `SchoolEvent with ID "${id}" not found to delete`,
      );
    }
    await this.schoolEventService.remove(id);
    return; // Explicit return for Promise<void>
  }
}
