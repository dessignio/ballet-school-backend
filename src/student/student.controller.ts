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
} from '@nestjs/common';
import { StudentService, SafeStudent } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
@UsePipes(
  // Aplica validación a todos los DTOs en este controlador
  new ValidationPipe({
    whitelist: true, // Ignora propiedades no definidas en el DTO
    forbidNonWhitelisted: true, // Lanza un error si se envían propiedades no permitidas
    transform: true, // Transforma los datos de entrada a sus tipos de DTO
  }),
)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto): Promise<SafeStudent> {
    return this.studentService.create(createStudentDto);
  }

  @Get()
  findAll(): Promise<SafeStudent[]> {
    return this.studentService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SafeStudent> {
    const student = await this.studentService.findOne(id);
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
    return updatedStudent;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un código 204 (No Content) en caso de éxito
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.studentService.remove(id);
  }
}
