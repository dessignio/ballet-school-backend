/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/admin-user/admin-user.controller.ts
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
import { AdminUserService, SafeAdminUser } from './admin-user.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { BulkUpdateAdminUserStatusDto } from './dto/bulk-update-admin-user-status.dto';
import { BulkUpdateAdminUserRoleDto } from './dto/bulk-update-admin-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin-users')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createAdminUserDto: CreateAdminUserDto,
    @Req() req,
  ): Promise<SafeAdminUser> {
    const studioId = req.user.studioId;
    return this.adminUserService.create(createAdminUserDto, studioId);
  }

  @Get()
  findAll(@Req() req): Promise<SafeAdminUser[]> {
    const studioId = req.user.studioId;
    return this.adminUserService.findAll(studioId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ): Promise<SafeAdminUser> {
    const studioId = req.user.studioId;
    return this.adminUserService.findOne(id, studioId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminUserDto: UpdateAdminUserDto,
    @Req() req,
  ): Promise<SafeAdminUser> {
    const studioId = req.user.studioId;
    return this.adminUserService.update(id, updateAdminUserDto, studioId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req): Promise<void> {
    const studioId = req.user.studioId;
    return this.adminUserService.remove(id, studioId);
  }

  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  bulkUpdateStatus(
    @Body() bulkUpdateDto: BulkUpdateAdminUserStatusDto,
    @Req() req,
  ): Promise<{ updatedCount: number }> {
    const studioId = req.user.studioId;
    return this.adminUserService.bulkUpdateStatus(
      bulkUpdateDto.ids,
      bulkUpdateDto.status,
      studioId,
    );
  }

  @Post('bulk-update-role')
  @HttpCode(HttpStatus.OK)
  bulkUpdateRole(
    @Body() bulkUpdateDto: BulkUpdateAdminUserRoleDto,
    @Req() req,
  ): Promise<{ updatedCount: number }> {
    const studioId = req.user.studioId;
    return this.adminUserService.bulkUpdateRole(
      bulkUpdateDto.ids,
      bulkUpdateDto.roleId,
      studioId,
    );
  }
}
