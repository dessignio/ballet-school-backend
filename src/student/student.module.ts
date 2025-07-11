// src/student/student.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { Parent } from 'src/parent/parent.entity';
import { Enrollment } from 'src/enrollment/enrollment.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      MembershipPlanDefinitionEntity,
      Parent,
      Enrollment,
      ClassOffering,
    ]),
    NotificationModule,
  ],
  providers: [StudentService],
  controllers: [StudentController],
  exports: [StudentService],
})
export class StudentModule {}
