/* eslint-disable @typescript-eslint/no-unsafe-return */
// ballet-school-backend/src/scheduled-class-slot/scheduled-class-slot.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClassOffering } from '../class-offering/class-offering.entity';
import { Studio } from '../studio/studio.entity'; // Assuming Studio entity path

@Entity('scheduled_class_slots')
export class ScheduledClassSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' }) // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  dayOfWeek: number;

  @Column({ type: 'time' }) // HH:mm:ss format
  startTime: string;

  @Column({ type: 'time' }) // HH:mm:ss format
  endTime: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  room: string;

  // Foreign Key to ClassOffering
  @Column({ type: 'uuid' })
  classOfferingId: string;

  @ManyToOne(
    () => ClassOffering,
    (classOffering: ClassOffering) => classOffering.scheduledClassSlots,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'classOfferingId' })
  classOffering: ClassOffering;

  // Foreign Key to Studio for multi-tenancy
  @Column({ type: 'uuid' })
  studioId: string;

  @ManyToOne(() => Studio, (studio: Studio) => studio.scheduledClassSlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studioId' })
  studio: Studio;
}
