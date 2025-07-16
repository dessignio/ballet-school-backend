// src/program/program.controller.ts
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
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProgramService } from './program.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

@Controller('programs')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProgramDto: CreateProgramDto, @Req() req: Request) {
    // Apply type assertion
    return this.programService.create(
      createProgramDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  findAll(@Req() req: Request) {
    // Apply type assertion
    return this.programService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.programService.findOne(id, req.user as Partial<AdminUser>);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProgramDto: UpdateProgramDto,
    @Req() req: Request,
  ) {
    // Apply type assertion
    return this.programService.update(
      id,
      updateProgramDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.programService.remove(id, req.user as Partial<AdminUser>);
  }
}
