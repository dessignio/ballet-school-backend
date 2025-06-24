
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
import { IsUUID, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

// DTO for the dedicated membership update endpoint
class UpdateStudentMembershipDto {
    @IsUUID('4')
    @IsNotEmpty()
    membershipPlanId: string | null;

    @IsOptional()
    @IsDateString()
    membershipStartDate?: string | null;
}


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
      throw new NotFoundException(\`Student with ID "\${id}" not found\`);
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
    // The service now returns null if not found, so controller throws NotFoundException
    if (!updatedStudent) {
      throw new NotFoundException(
        \`Student with ID "\${id}" not found to update\`,
      );
    }
    return updatedStudent;
  }
  
  @Patch(':studentId/membership')
  async updateMembership(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() updateMembershipDto: UpdateStudentMembershipDto,
  ): Promise<SafeStudent> {
    if (updateMembershipDto.membershipPlanId === undefined) {
        throw new BadRequestException('membershipPlanId must be provided, can be null to remove membership.');
    }
    const updatedStudent = await this.studentService.updateStudentMembershipInfo(
      studentId,
      updateMembershipDto.membershipPlanId,
      updateMembershipDto.membershipStartDate,
    );
    return updatedStudent;
  }


  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    // Service method now throws NotFoundException if student to delete is not found
    await this.studentService.remove(id);
  }
}
