// src/enrollment/enrollment.entity.ts
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
import {
  EnrollmentStatus,
  EnrollmentStatusValues,
} from './types/enrollment-status.type'; // Added EnrollmentStatusValues import
import { Student } from 'src/student/student.entity';
import { ClassOffering } from 'src/class-offering/class-offering.entity';

@Entity('enrollments')
@Index(['studentId', 'classOfferingId'], { unique: true }) // Prevent duplicate enrollments
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'date' })
  enrollmentDate: string; // ISO Date string, e.g., "YYYY-MM-DD"

  @Column({
    type: 'enum',
    enum: EnrollmentStatusValues,
    default: 'Enrolled',
  })
  status: EnrollmentStatus;

  @Column({ type: 'integer', nullable: true })
  waitlistPosition?: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
