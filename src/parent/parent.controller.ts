// src/parent/parent.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ParentService, SafeParent } from './parent.service';
import { CreateParentDto, UpdateParentDto } from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('parents')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Post()
  create(@Body() createParentDto: CreateParentDto, @Req() req: Request): Promise<SafeParent> {
    return this.parentService.create(createParentDto, req.user);
  }

  @Get()
  findAll(@Req() req: Request): Promise<SafeParent[]> {
    return this.parentService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<SafeParent> {
    return this.parentService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParentDto: UpdateParentDto,
    @Req() req: Request,
  ): Promise<SafeParent> {
    return this.parentService.update(id, updateParentDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request): Promise<void> {
    return this.parentService.remove(id, req.user);
  }
}
