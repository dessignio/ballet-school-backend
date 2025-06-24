import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './student.entity';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity'; // Added import

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, MembershipPlanDefinitionEntity]),
  ], // Added MembershipPlanDefinitionEntity
  providers: [StudentService],
  controllers: [StudentController],
})
export class StudentModule {}
