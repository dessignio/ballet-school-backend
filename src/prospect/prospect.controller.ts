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
} from '@nestjs/common';
import { ProspectService } from './prospect.service';
import {
  CreateProspectDto,
  UpdateProspectDto,
  ApproveProspectDto,
} from './dto';

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
  create(@Body() createProspectDto: CreateProspectDto) {
    return this.prospectService.create(createProspectDto);
  }

  @Get()
  findAll() {
    return this.prospectService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.prospectService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProspectDto: UpdateProspectDto,
  ) {
    return this.prospectService.update(id, updateProspectDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.prospectService.remove(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveDto: ApproveProspectDto,
  ) {
    return this.prospectService.approve(id, approveDto);
  }
}
