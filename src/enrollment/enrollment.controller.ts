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
} from '@nestjs/common';
import { EnrollmentService, MappedEnrollment } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

@Controller('enrollments')
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
  ): Promise<MappedEnrollment> {
    return this.enrollmentService.create(createEnrollmentDto);
  }

  @Get()
  findAll(
    @Query('classOfferingId') classOfferingId?: string,
    @Query('studentId') studentId?: string,
  ): Promise<MappedEnrollment[]> {
    if (classOfferingId && !this.isValidUUID(classOfferingId)) {
      throw new NotFoundException('Invalid Class Offering ID format.');
    }
    if (studentId && !this.isValidUUID(studentId)) {
      throw new NotFoundException('Invalid Student ID format.');
    }
    return this.enrollmentService.findAllByCriteria(classOfferingId, studentId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MappedEnrollment> {
    return this.enrollmentService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<MappedEnrollment> {
    return this.enrollmentService.update(id, updateEnrollmentDto);
  }

  // This custom route matches the frontend apiService
  @Delete('student/:studentId/class/:classOfferingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeByStudentAndClass(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('classOfferingId', ParseUUIDPipe) classOfferingId: string,
  ): Promise<void> {
    return this.enrollmentService.removeByStudentAndClass(
      studentId,
      classOfferingId,
    );
  }

  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
