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
    return this.membershipPlanService.create(createPlanDto, req.user);
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.membershipPlanService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.membershipPlanService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanDto: UpdateMembershipPlanDto,
    @Req() req: Request,
  ) {
    return this.membershipPlanService.update(id, updatePlanDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.membershipPlanService.remove(id, req.user);
  }
}
