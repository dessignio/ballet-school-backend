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
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

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
  create(
    @Body() createParentDto: CreateParentDto,
    @Req() req: Request,
  ): Promise<SafeParent> {
    // Apply type assertion
    return this.parentService.create(
      createParentDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  findAll(@Req() req: Request): Promise<SafeParent[]> {
    // Apply type assertion
    return this.parentService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<SafeParent> {
    // Apply type assertion
    return this.parentService.findOne(id, req.user as Partial<AdminUser>);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParentDto: UpdateParentDto,
    @Req() req: Request,
  ): Promise<SafeParent> {
    // Apply type assertion
    return this.parentService.update(
      id,
      updateParentDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<void> {
    // Apply type assertion
    return this.parentService.remove(id, req.user as Partial<AdminUser>);
  }
}
