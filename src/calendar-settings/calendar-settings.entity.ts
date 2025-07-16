// src/calendar-settings/calendar-settings.entity.ts
import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Studio } from '../studio/studio.entity';

// These interfaces define the shape of objects stored in JSONB columns.
// They are not separate TypeORM entities.
export interface SchoolTerm {
  id: string; // UUID generated on the frontend
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface StudioRoom {
  id: string; // UUID generated on the frontend
  name: string;
  capacity?: number;
  description?: string;
  color?: string; // Hex color string e.g., #FF5733
}

@Entity('calendar_settings')
export class CalendarSettings {
  @PrimaryColumn({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @OneToOne(() => Studio)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'int', default: 60 })
  defaultClassDuration: number; // in minutes

  @Column({ type: 'varchar', length: 100, default: 'America/New_York' })
  studioTimezone: string;

  @Column({ type: 'int', default: 0 }) // 0 for Sunday, 1 for Monday
  weekStartDay: 0 | 1;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  terms: SchoolTerm[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  rooms: StudioRoom[];

  @UpdateDateColumn()
  updatedAt: Date;
}
