// ballet-school-backend/src/absence/absence.controller.ts
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
  Query, // Import Query decorator
} from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto';
import { Absence } from './absence.entity';

@Controller('absences')
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Post()
  async create(@Body() createAbsenceDto: CreateAbsenceDto): Promise<Absence> {
    // Basic validation could be added here if not using class-validator
    if (
      !createAbsenceDto.studentId ||
      !createAbsenceDto.classId ||
      !createAbsenceDto.reason
    ) {
      // throw new BadRequestException('Student ID, Class ID, and Reason are required.');
    }
    return this.absenceService.create(createAbsenceDto);
  }

  // Optional: Endpoint to get all absences (e.g., for an admin panel)
  @Get()
  async findAll(): Promise<Absence[]> {
    return this.absenceService.findAll();
  }

  // Optional: Endpoint to get absences for a specific student, potentially filtered by date
  @Get('student/:studentId')
  async findAllByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('date') date?: string, // Optional date query parameter (YYYY-MM-DD)
  ): Promise<Absence[]> {
    // Optional: Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // throw new BadRequestException('Invalid date format. Please use YYYY-MM-DD.');
      // For now, let's proceed, service might handle it or DB might ignore if 'Like' fails
    }
    return this.absenceService.findAllByStudent(studentId, date);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Absence> {
    const absence = await this.absenceService.findOne(id);
    if (!absence) {
      throw new NotFoundException(`Absence with ID "${id}" not found`);
    }
    return absence;
  }

  // Optional: Endpoint to update an absence (e.g., for an admin to mark as 'Justificada')
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAbsenceDto: UpdateAbsenceDto,
  ): Promise<Absence> {
    const updatedAbsence = await this.absenceService.update(
      id,
      updateAbsenceDto,
    );
    if (!updatedAbsence) {
      throw new NotFoundException(
        `Absence with ID "${id}" not found to update`,
      );
    }
    return updatedAbsence;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const absence = await this.absenceService.findOne(id);
    if (!absence) {
      throw new NotFoundException(
        `Absence with ID "${id}" not found to delete`,
      );
    }
    await this.absenceService.remove(id);
  }
}
