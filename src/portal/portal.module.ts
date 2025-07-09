import { Module } from '@nestjs/common';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { ParentModule } from 'src/parent/parent.module';
import { StudentModule } from 'src/student/student.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from 'src/parent/parent.entity';
import { Student } from 'src/student/student.entity';

@Module({
  imports: [
    ParentModule,
    StudentModule,
    TypeOrmModule.forFeature([Parent, Student]),
  ],
  controllers: [PortalController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
