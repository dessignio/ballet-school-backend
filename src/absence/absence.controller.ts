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
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto';
import { Absence } from './absence.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('absences')
@UseGuards(JwtAuthGuard)
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Post()
  async create(@Body() createAbsenceDto: CreateAbsenceDto, @Req() req: Request): Promise<Absence> {
    return this.absenceService.create(createAbsenceDto, req.user);
  }

  @Get()
  async findAll(@Req() req: Request): Promise<Absence[]> {
    return this.absenceService.findAll(req.user);
  }

  @Get('student/:studentId')
  async findAllByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('date') date?: string,
    @Req() req: Request,
  ): Promise<Absence[]> {
    return this.absenceService.findAllByStudent(studentId, req.user, date);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<Absence> {
    const absence = await this.absenceService.findOne(id, req.user);
    if (!absence) {
      throw new NotFoundException(`Absence with ID "${id}" not found`);
    }
    return absence;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAbsenceDto: UpdateAbsenceDto,
    @Req() req: Request,
  ): Promise<Absence> {
    const updatedAbsence = await this.absenceService.update(
      id,
      updateAbsenceDto,
      req.user,
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
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    await this.absenceService.remove(id, req.user);
  }
}
