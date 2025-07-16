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
import { MembershipPlanService } from './membership-plan.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { AdminUser } from 'src/admin-user/admin-user.entity'; // Import AdminUser

@Controller('membership-plans')
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class MembershipPlanController {
  constructor(private readonly membershipPlanService: MembershipPlanService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPlanDto: CreateMembershipPlanDto, @Req() req: Request) {
    // Apply type assertion
    return this.membershipPlanService.create(
      createPlanDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Get()
  findAll(@Req() req: Request) {
    // Apply type assertion
    return this.membershipPlanService.findAll(req.user as Partial<AdminUser>);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.membershipPlanService.findOne(
      id,
      req.user as Partial<AdminUser>,
    );
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanDto: UpdateMembershipPlanDto,
    @Req() req: Request,
  ) {
    // Apply type assertion
    return this.membershipPlanService.update(
      id,
      updatePlanDto,
      req.user as Partial<AdminUser>,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    // Apply type assertion
    return this.membershipPlanService.remove(
      id,
      req.user as Partial<AdminUser>,
    );
  }
}
