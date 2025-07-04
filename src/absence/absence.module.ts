// ballet-school-backend/src/absence/absence.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Absence } from './absence.entity';
import { AbsenceService } from './absence.service';
import { AbsenceController } from './absence.controller';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [TypeOrmModule.forFeature([Absence]), NotificationModule],
  controllers: [AbsenceController],
  providers: [AbsenceService],
})
export class AbsenceModule {}
