// src/class-offering/class-offering.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ScheduledClassSlot } from 'src/scheduled-class-slot/scheduled-class-slot.entity';
import { ProgramName } from 'src/program/types/program-name.type';
import { DancerLevelName } from 'src/program/types/dancer-level-name.type';
import { StudentGeneralLevel } from 'src/student/types/student-general-level.type';
import { Studio } from '../studio/studio.entity';

@Entity('class_offerings')
export class ClassOffering {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.classOfferings)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100 })
  category: string; // e.g., Ballet, Jazz, Hip Hop

  @Column({
    type: 'enum',
    enum: ['Principiante', 'Intermedio', 'Avanzado', 'Profesional'],
  })
  level: StudentGeneralLevel;

  @Column({ type: 'text', nullable: true })
  iconUrl?: string | null;

  @Column({ type: 'text' })
  descriptionShort: string;

  @Column({ type: 'text', nullable: true })
  descriptionLong: string;

  @Column({ length: 50 }) // e.g., "1 hour", "45 minutes"
  duration: string;

  @Column({ length: 50 }) // e.g., "$60/month", "$20/class"
  price: string;

  @Column({ type: 'integer', default: 0 }) // Default capacity to 0 (or a sensible default like 10, 15)
  capacity: number;

  @Column({ type: 'integer', default: 0 })
  enrolledCount: number;

  @Column({ type: 'text', nullable: true })
  videoEmbedUrl?: string | null;

  @Column({ length: 255 }) // Name of the instructor
  instructorName: string;

  @Column({ type: 'text', nullable: true }) // Optional class-specific bio for the instructor
  instructorBio?: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  prerequisites?: string[]; // Array of prerequisite descriptions or class IDs

  @Column({ type: 'text', array: true, nullable: true })
  targetPrograms?: ProgramName[]; // e.g., ['New Stars', 'Dancers']

  @Column({ type: 'text', array: true, nullable: true })
  targetDancerLevels?: DancerLevelName[]; // e.g., ['Explorer 1', 'Deep']

  // Relation to ScheduledClassSlot
  @OneToMany(
    () => ScheduledClassSlot,
    (slot: ScheduledClassSlot) => slot.classOffering,
    { cascade: true, eager: true },
  )
  scheduledClassSlots: ScheduledClassSlot[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
