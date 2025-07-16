// src/role/role.controller.ts
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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';

// Define a type for the JWT payload to ensure type safety
interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  studioId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('roles')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRoleDto: CreateRoleDto, @Req() req: Request) {
    // Apply type assertion before accessing property
    const studioId = (req.user as JwtPayload).studioId;
    return this.roleService.create(createRoleDto, studioId);
  }

  @Get()
  findAll(@Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.roleService.findAll(studioId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.roleService.findOne(id, studioId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req: Request,
  ) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.roleService.update(id, updateRoleDto, studioId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const studioId = (req.user as JwtPayload).studioId;
    return this.roleService.remove(id, studioId);
  }
}
