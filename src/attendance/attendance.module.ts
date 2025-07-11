// src/attendance/attendance.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from './attendance.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Student } from 'src/student/student.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';
import { NotificationModule } from 'src/notification/notification.module';
// Absence entity might be needed if linking absenceId is more deeply integrated

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, Student, ClassOffering]),
    NotificationModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
