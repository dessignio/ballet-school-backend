// src/attendance/attendance.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from 'src/student/student.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';
import { Absence } from 'src/absence/absence.entity';
import {
  AttendanceStatus,
  AttendanceStatusValues,
} from './types/attendance-status.type';
import { Studio } from '../studio/studio.entity';

@Entity('attendance_records')
@Index(['studentId', 'classOfferingId', 'classDateTime', 'studioId'], {
  unique: true,
})
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid' })
  classOfferingId: string;

  @ManyToOne(() => ClassOffering, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classOfferingId' })
  classOffering: ClassOffering;

  @Column({ type: 'timestamp with time zone' })
  classDateTime: string;

  @Column({
    type: 'enum',
    enum: AttendanceStatusValues,
  })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', nullable: true })
  absenceId?: string;

  @ManyToOne(() => Absence, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'absenceId' })
  absence?: Absence;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
