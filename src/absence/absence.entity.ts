// ballet-school-backend/src/absence/absence.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type AbsenceStatus = 'Notificada' | 'Justificada' | 'No Justificada';

@Entity('absences')
export class Absence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' }) // Assuming student.id is a UUID
  studentId: string;

  @Column({ type: 'varchar', length: 255 })
  studentName: string; // For easier display/querying

  @Column({ type: 'varchar' }) // Can be classOffering.id or a ScheduleItem.id
  classId: string;

  @Column({ type: 'varchar', length: 255 })
  className: string;

  @Column({ type: 'timestamp with time zone' }) // Storing original class time + date
  classDateTime: string;

  @Column({ type: 'varchar', length: 100 })
  reason: string; // e.g., 'enfermedad', 'lesion', 'viaje'

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'notification_date',
  })
  notificationDate: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'Notificada',
  })
  status: AbsenceStatus;
}
