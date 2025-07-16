/* eslint-disable @typescript-eslint/no-unused-vars */
// src/student/student.controller.ts
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
  UsePipes,
  ValidationPipe,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StudentService, SafeStudent } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

@Controller('students')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(
    @Body() createStudentDto: CreateStudentDto,
    @Req() req: Request,
  ): Promise<SafeStudent> {
    // Apply type assertion
    return this.studentService.create(
      createStudentDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  findAll(@Req() req: Request): Promise<SafeStudent[]> {
    // Apply type assertion
    return this.studentService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<SafeStudent> {
    // Apply type assertion
    const student = await this.studentService.findOne(
      id,
      req.user as Partial<AdminUser>,
    );
    return student;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: Request,
  ): Promise<SafeStudent> {
    // Apply type assertion
    const updatedStudent = await this.studentService.update(
      id,
      updateStudentDto,
      req.user as Partial<AdminUser>,
    );
    return updatedStudent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    // Apply type assertion
    await this.studentService.remove(id, req.user as Partial<AdminUser>);
  }
}
