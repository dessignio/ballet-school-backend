// src/enrollment/enrollment.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { Enrollment } from './enrollment.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity'; // For updating enrolledCount
import { Student } from 'src/student/student.entity'; // For fetching student details for response
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, ClassOffering, Student]),
    NotificationModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
})
export class EnrollmentModule {}
