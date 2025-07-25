// ballet-school-backend/src/announcement/announcement.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type AnnouncementCategory =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  'Eventos' | 'Horarios' | 'General' | 'Urgente' | string;

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 100 })
  category: AnnouncementCategory;

  @Column({ type: 'boolean', default: false })
  isImportant: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date' }) // Using CreateDateColumn for the announcement date
  date: Date; // This will be the creation date, effectively the announcement date
}
