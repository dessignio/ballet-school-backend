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
// BORRADO: El DTO para la actualización de membresía ya no es necesario aquí.

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
    // CORREGIDO: La lógica se simplifica. El servicio ahora lanza el error si no encuentra al estudiante.
    // El controlador solo necesita llamar al servicio y retornar el resultado.
    const student = await this.studentService.findOne(id);
    // La comprobación 'if (!student)' ya no es necesaria aquí porque el servicio se encarga de ella.
    return student;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStudentDto: UpdateStudentDto,
  ): Promise<SafeStudent> {
    // CORREGIDO: La lógica se simplifica. El servicio ahora lanza el error si no encuentra al estudiante para actualizar.
    const updatedStudent = await this.studentService.update(
      id,
      updateStudentDto,
    );
    return updatedStudent;
  }

  // BORRADO: Este endpoint ya no es necesario porque la lógica para actualizar la membresía
  // se ha integrado de forma más robusta en el método `update` principal.
  // Esto simplifica la API y evita tener endpoints redundantes.
  // @Patch(':studentId/membership')
  // ...

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Devuelve un código 204 (No Content) en caso de éxito
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    // La lógica es correcta: el servicio se encarga de lanzar el error si no se encuentra.
    await this.studentService.remove(id);
  }
}
