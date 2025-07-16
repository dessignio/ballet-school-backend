// src/prospect/prospect.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProspectService } from './prospect.service';
import {
  CreateProspectDto,
  UpdateProspectDto,
  ApproveProspectDto,
} from './dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

// Definimos un tipo que representa la estructura del payload del token JWT
interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  studioId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('prospects')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ProspectController {
  constructor(private readonly prospectService: ProspectService) {}

  @Post()
  create(@Body() createProspectDto: CreateProspectDto, @Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.prospectService.create(createProspectDto, studioId);
  }

  @Get()
  findAll(@Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.prospectService.findAll(studioId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.prospectService.findOne(id, studioId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProspectDto: UpdateProspectDto,
    @Req() req: Request,
  ) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.prospectService.update(id, updateProspectDto, studioId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.prospectService.remove(id, studioId);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveDto: ApproveProspectDto,
    @Req() req: Request,
  ) {
    const studioId = (req.user as JwtPayload).studioId;
    // CORRECCIÓN: Pasamos el objeto req.user al servicio
    return this.prospectService.approve(
      id,
      approveDto,
      studioId,
      req.user as JwtPayload,
    );
  }
}
