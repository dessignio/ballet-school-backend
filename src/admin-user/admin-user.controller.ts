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
  ValidationPipe, // To work with @Exclude in entity if used
} from '@nestjs/common';
import { AdminUserService, SafeAdminUser } from './admin-user.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { BulkUpdateAdminUserStatusDto } from './dto/bulk-update-admin-user-status.dto';
import { BulkUpdateAdminUserRoleDto } from './dto/bulk-update-admin-user-role.dto';

@Controller('admin-users')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
// @UseInterceptors(ClassSerializerInterceptor) // Use if AdminUser entity uses @Exclude for password
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createAdminUserDto: CreateAdminUserDto,
  ): Promise<SafeAdminUser> {
    return this.adminUserService.create(createAdminUserDto);
  }

  @Get()
  findAll(): Promise<SafeAdminUser[]> {
    return this.adminUserService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SafeAdminUser> {
    return this.adminUserService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminUserDto: UpdateAdminUserDto,
  ): Promise<SafeAdminUser> {
    return this.adminUserService.update(id, updateAdminUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.adminUserService.remove(id);
  }

  @Post('bulk-update-status')
  @HttpCode(HttpStatus.OK)
  bulkUpdateStatus(
    @Body() bulkUpdateDto: BulkUpdateAdminUserStatusDto,
  ): Promise<{ updatedCount: number }> {
    return this.adminUserService.bulkUpdateStatus(
      bulkUpdateDto.ids,
      bulkUpdateDto.status,
    );
  }

  @Post('bulk-update-role')
  @HttpCode(HttpStatus.OK)
  bulkUpdateRole(
    @Body() bulkUpdateDto: BulkUpdateAdminUserRoleDto,
  ): Promise<{ updatedCount: number }> {
    return this.adminUserService.bulkUpdateRole(
      bulkUpdateDto.ids,
      bulkUpdateDto.roleId,
    );
  }
}
