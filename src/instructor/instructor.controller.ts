// src/instructor/instructor.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

@Controller('instructors')
@UseGuards(JwtAuthGuard)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createInstructorDto: CreateInstructorDto,
    @Req() req: Request,
  ) {
    // Apply type assertion
    return this.instructorService.create(
      createInstructorDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  findAll(@Req() req: Request) {
    // Apply type assertion
    return this.instructorService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.instructorService.findOne(id, req.user as Partial<AdminUser>);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInstructorDto: UpdateInstructorDto,
    @Req() req: Request,
  ) {
    // Apply type assertion
    return this.instructorService.update(
      id,
      updateInstructorDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.instructorService.remove(id, req.user as Partial<AdminUser>);
  }
}
