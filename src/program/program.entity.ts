// src/program/program.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Studio } from '../studio/studio.entity';

@Unique(['name', 'studioId'])
@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.programs)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false, // Explicitly set to NOT NULL
  })
  name: string; // Was ProgramName, now just string

  @Column({ length: 255 })
  ageRange: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  hasLevels: boolean;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  levels?: string[]; // Was DancerLevelName[], now string[]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
