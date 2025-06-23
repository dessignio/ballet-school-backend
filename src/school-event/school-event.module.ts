// ballet-school-backend/src/school-event/school-event.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolEvent } from './school-event.entity';
import { SchoolEventService } from './school-event.service';
import { SchoolEventController } from './school-event.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolEvent])],
  controllers: [SchoolEventController],
  providers: [SchoolEventService],
})
export class SchoolEventModule {}
