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
  BadRequestException, // Import BadRequestException
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto, BulkMarkAttendanceDto } from './dto';
import { AttendanceRecord } from './attendance.entity';

@Controller('attendance')
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
    @Query('date') date: string, // Expects YYYY-MM-DD format
  ): Promise<AttendanceRecord[]> {
    // Basic date format validation
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Corrected regex
      // Using NestJS's BadRequestException for better error handling
      throw new BadRequestException(
        'Invalid or missing date parameter. Expected YYYY-MM-DD.',
      );
    }
    return this.attendanceService.findByClassAndDate(classOfferingId, date);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.OK) // Upsert returns 200 if successful update, 201 if new created (can be unified to 200 for simplicity)
  async upsertAttendance(
    @Body() createAttendanceDto: CreateAttendanceDto,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.upsertAttendance(createAttendanceDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpsertAttendance(
    @Body() bulkDto: BulkMarkAttendanceDto,
  ): Promise<AttendanceRecord[]> {
    return this.attendanceService.bulkUpsertAttendance(bulkDto.records);
  }
}
