/* eslint-disable @typescript-eslint/no-unsafe-return */
// ballet-school-backend/src/school-event/school-event.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Studio } from '../studio/studio.entity'; // Assuming Studio entity path

@Entity('school_events')
export class SchoolEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' }) // Stores as YYYY-MM-DD
  date: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isHoliday: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  // Foreign Key to Studio for multi-tenancy
  @Column({ type: 'uuid' })
  studioId: string;

  @ManyToOne(() => Studio, (studio: Studio) => studio.schoolEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'studioId' })
  studio: Studio;
}
