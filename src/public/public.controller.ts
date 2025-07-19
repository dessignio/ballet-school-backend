import { Controller, Post, Body } from '@nestjs/common';
import { PublicService } from './public.service';
import { RegisterStudioDto } from './dto/register-studio.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Post('register-studio')
  async registerStudio(@Body() registerStudioDto: RegisterStudioDto) {
    return this.publicService.registerStudio(registerStudioDto);
  }
}
