// src/payment/payment.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from 'src/student/student.entity';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Invoice } from 'src/invoice/invoice.entity'; // For optional link

export const PaymentMethodValues = [
  'Cash',
  'Credit Card',
  'Bank Transfer',
  'Stripe Subscription',
  'Other',
] as const;

export type PaymentMethod = (typeof PaymentMethodValues)[number];

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  studentId: string;

  // --- LÍNEA AÑADIDA ---
  // Guardamos el nombre del estudiante para facilitar la visualización en reportes y tablas.
  @Column({ type: 'varchar', length: 255 })
  studentName: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ type: 'uuid', nullable: true }) // Nullable if payment is not for a specific plan (e.g., registration fee)
  membershipPlanId: string | null;

  @ManyToOne(() => MembershipPlanDefinitionEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'membershipPlanId' })
  membershipPlan: MembershipPlanDefinitionEntity | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  membershipPlanName?: string; // Denormalized for easier display

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountPaid: number;

  @Column({ type: 'date' }) // ISO Date string YYYY-MM-DD
  paymentDate: string;

  @Column({ type: 'varchar', length: 50 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId?: string; // e.g., Stripe charge ID or bank reference

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', nullable: true }) // Link to the local Invoice record
  invoiceId?: string | null;

  @ManyToOne(() => Invoice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invoiceId' })
  invoice?: Invoice | null;

  @Column({ type: 'uuid', nullable: true }) // Admin user who processed/recorded this, if applicable
  processedByUserId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
