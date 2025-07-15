// src/attendance/attendance.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, BulkMarkAttendanceDto } from './dto';
import { AttendanceRecord } from './attendance.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  async findByClassAndDate(
    @Query('classOfferingId', ParseUUIDPipe) classOfferingId: string,
    @Query('date') date: string,
    @Req() req: Request,
  ): Promise<AttendanceRecord[]> {
    if (!date) {
      throw new BadRequestException('Date parameter is required.');
    }
    return this.attendanceService.findByClassAndDate(classOfferingId, date, req.user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.findOne(id, req.user);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async upsertAttendance(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Req() req: Request,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.upsertAttendance(createAttendanceDto, req.user);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpsertAttendance(
    @Body() bulkDto: BulkMarkAttendanceDto,
    @Req() req: Request,
  ): Promise<AttendanceRecord[]> {
    return this.attendanceService.bulkUpsertAttendance(bulkDto.records, req.user);
  }
}
