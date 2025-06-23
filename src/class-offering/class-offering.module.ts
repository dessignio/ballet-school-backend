// ballet-school-backend/src/class-offering/class-offering.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassOffering } from './class-offering.entity';
import { ClassOfferingService } from './class-offering.service';
import { ClassOfferingController } from './class-offering.controller';
import { ScheduledClassSlotModule } from '../scheduled-class-slot/scheduled-class-slot.module';
import { ScheduledClassSlot } from '../scheduled-class-slot/scheduled-class-slot.entity';
import { ProgramModule } from '../program/program.module'; // Import ProgramModule
import { Program } from '../program/program.entity'; // Import Program entity

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassOffering, ScheduledClassSlot, Program]), // Add Program entity
    ScheduledClassSlotModule,
    ProgramModule, // Import ProgramModule to access ProgramRepository/Service
  ],
  controllers: [ClassOfferingController],
  providers: [ClassOfferingService],
})
export class ClassOfferingModule {}
