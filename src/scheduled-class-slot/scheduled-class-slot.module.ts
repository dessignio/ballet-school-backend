// ballet-school-backend/src/scheduled-class-slot/scheduled-class-slot.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledClassSlot } from './scheduled-class-slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledClassSlot])],
  providers: [], // No service/controller needed if managed via ClassOffering
  exports: [TypeOrmModule],
})
export class ScheduledClassSlotModule {}
