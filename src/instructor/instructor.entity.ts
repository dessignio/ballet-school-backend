// src/instructor/instructor.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProgramName } from './types/program-name.type';
import { Studio } from '../studio/studio.entity';

// This interface is for type-hinting the structure within the JSONB column
// It's not a separate TypeORM entity in this simplified setup.
export interface InstructorAvailabilitySlotEmbed {
  // No 'id' here as it's part of a JSON array, not a separate table row.
  // Frontend 'id' is for React keying.
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

@Entity('instructors')
export class Instructor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.instructors)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({
    type: 'text', // In PostgreSQL, this can be 'text[]' for an array of strings
    array: true,
    default: () => "'{}'", // Default to an empty array
  })
  specializations: ProgramName[];

  @Column({
    type: 'jsonb', // Stores the availability slots as a JSON array
    array: false, // jsonb itself will hold an array of objects
    default: () => "'[]'", // Default to an empty JSON array
    nullable: true,
  })
  availability: InstructorAvailabilitySlotEmbed[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
