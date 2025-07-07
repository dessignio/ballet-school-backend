// src/student/student.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { Parent } from 'src/parent/parent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, MembershipPlanDefinitionEntity, Parent]),
    NotificationModule,
  ],
  providers: [StudentService],
  controllers: [StudentController],
  exports: [StudentService],
})
export class StudentModule {}
