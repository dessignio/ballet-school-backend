// ballet-school-backend/src/class-offering/class-offering.controller.ts
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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClassOfferingService } from './class-offering.service';
import { CreateClassOfferingDto, UpdateClassOfferingDto } from './dto';
import { ClassOffering } from './class-offering.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('class-offerings')
@UseGuards(JwtAuthGuard)
export class ClassOfferingController {
  constructor(private readonly classOfferingService: ClassOfferingService) {}

  @Post()
  async create(
    @Body() createClassOfferingDto: CreateClassOfferingDto,
    @Req() req: Request,
  ): Promise<ClassOffering> {
    return this.classOfferingService.create(createClassOfferingDto, req.user);
  }

  @Get()
  async findAll(@Req() req: Request): Promise<ClassOffering[]> {
    return this.classOfferingService.findAll(req.user);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<ClassOffering> {
    const classOffering = await this.classOfferingService.findOne(id, req.user);
    if (!classOffering) {
      throw new NotFoundException(`ClassOffering with ID "${id}" not found`);
    }
    return classOffering;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassOfferingDto: UpdateClassOfferingDto,
    @Req() req: Request,
  ): Promise<ClassOffering> {
    const updatedClassOffering = await this.classOfferingService.update(
      id,
      updateClassOfferingDto,
      req.user,
    );
    if (!updatedClassOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to update`,
      );
    }
    return updatedClassOffering;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    await this.classOfferingService.remove(id, req.user);
  }
}
