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
} from '@nestjs/common';
import { StudentService, SafeStudent } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
// Student entity is not directly returned, SafeStudent is.

@Controller('students')
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
  async create(
    @Body() createStudentDto: CreateStudentDto,
  ): Promise<SafeStudent> {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  async findAll(): Promise<SafeStudent[]> {
    return this.studentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SafeStudent> {
    const student = await this.studentService.findOne(id);
    if (!student) {
      throw new NotFoundException(`Student with ID "${id}" not found`);
    }
    return student;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<SafeStudent> {
    const updatedStudent = await this.studentService.update(
      id,
      updateStudentDto,
    );
    if (!updatedStudent) {
      throw new NotFoundException(
        `Student with ID "${id}" not found to update`,
      );
    }
    return updatedStudent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const student = await this.studentService.findOne(id);
    if (!student) {
      throw new NotFoundException(
        `Student with ID "${id}" not found to delete`,
      );
    }
    await this.studentService.remove(id);
  }
}
