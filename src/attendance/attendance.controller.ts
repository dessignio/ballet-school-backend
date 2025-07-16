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
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Importar AdminUser

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
    // Aplicar aserción de tipo
    return this.attendanceService.findByClassAndDate(
      classOfferingId,
      date,
      req.user as Partial<AdminUser>,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<AttendanceRecord> {
    // Aplicar aserción de tipo
    return this.attendanceService.findOne(id, req.user as Partial<AdminUser>);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async upsertAttendance(
    @Body() createAttendanceDto: CreateAttendanceDto,
    @Req() req: Request,
  ): Promise<AttendanceRecord> {
    // Aplicar aserción de tipo
    return this.attendanceService.upsertAttendance(
      createAttendanceDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkUpsertAttendance(
    @Body() bulkDto: BulkMarkAttendanceDto,
    @Req() req: Request,
  ): Promise<AttendanceRecord[]> {
    // Aplicar aserción de tipo
    return this.attendanceService.bulkUpsertAttendance(
      bulkDto.records,
      req.user as Partial<AdminUser>,
    );
  }
}
