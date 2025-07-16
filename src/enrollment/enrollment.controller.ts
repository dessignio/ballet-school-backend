/* eslint-disable @typescript-eslint/no-unused-vars */
// src/enrollment/enrollment.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EnrollmentService, MappedEnrollment } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Req() req: Request,
  ): Promise<MappedEnrollment> {
    return this.enrollmentService.create(
      createEnrollmentDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  // ORDEN DE PARÁMETROS CORREGIDO AQUÍ: @Req() va primero.
  findAll(
    @Req() req: Request,
    @Query('classOfferingId') classOfferingId?: string,
    @Query('studentId') studentId?: string,
  ): Promise<MappedEnrollment[]> {
    return this.enrollmentService.findAllByCriteria(
      req.user as Partial<AdminUser>,
      classOfferingId,
      studentId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<MappedEnrollment> {
    return this.enrollmentService.findOne(id, req.user as Partial<AdminUser>);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Req() req: Request,
  ): Promise<MappedEnrollment> {
    return this.enrollmentService.update(
      id,
      updateEnrollmentDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete('student/:studentId/class/:classOfferingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeByStudentAndClass(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('classOfferingId', ParseUUIDPipe) classOfferingId: string,
    @Req() req: Request,
  ): Promise<void> {
    return this.enrollmentService.removeByStudentAndClass(
      studentId,
      classOfferingId,
      req.user as Partial<AdminUser>,
    );
  }
}
