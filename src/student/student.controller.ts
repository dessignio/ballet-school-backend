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
  create(@Body() createStudentDto: CreateStudentDto, @Req() req: Request): Promise<SafeStudent> {
    return this.studentService.create(createStudentDto, req.user);
  }

  @Get()
  findAll(@Req() req: Request): Promise<SafeStudent[]> {
    return this.studentService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<SafeStudent> {
    const student = await this.studentService.findOne(id, req.user);
    return student;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
    @Req() req: Request,
  ): Promise<SafeStudent> {
    const updatedStudent = await this.studentService.update(
      id,
      updateStudentDto,
      req.user,
    );
    return updatedStudent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    await this.studentService.remove(id, req.user);
  }
}
