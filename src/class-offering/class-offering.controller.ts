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
} from '@nestjs/common';
import { ClassOfferingService } from './class-offering.service';
import { CreateClassOfferingDto, UpdateClassOfferingDto } from './dto';
import { ClassOffering } from './class-offering.entity';

@Controller('class-offerings') // Route prefix
export class ClassOfferingController {
  constructor(private readonly classOfferingService: ClassOfferingService) {}

  @Post()
  async create(
    @Body() createClassOfferingDto: CreateClassOfferingDto,
  ): Promise<ClassOffering> {
    return this.classOfferingService.create(createClassOfferingDto);
  }

  @Get()
  async findAll(): Promise<ClassOffering[]> {
    return this.classOfferingService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClassOffering> {
    const classOffering = await this.classOfferingService.findOne(id);
    if (!classOffering) {
      throw new NotFoundException(`ClassOffering with ID "${id}" not found`);
    }
    return classOffering;
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClassOfferingDto: UpdateClassOfferingDto,
  ): Promise<ClassOffering> {
    const updatedClassOffering = await this.classOfferingService.update(
      id,
      updateClassOfferingDto,
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
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const classOffering = await this.classOfferingService.findOne(id);
    if (!classOffering) {
      throw new NotFoundException(
        `ClassOffering with ID "${id}" not found to delete`,
      );
    }
    await this.classOfferingService.remove(id);
  }
}
