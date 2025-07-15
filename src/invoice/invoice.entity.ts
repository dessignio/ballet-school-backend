// src/invoice/invoice.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Student } from 'src/student/student.entity';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Payment } from 'src/payment/payment.entity'; // For optional link
import { InvoiceItem, InvoiceStatus } from './invoice.types';
import { Studio } from '../studio/studio.entity';

@Entity('invoices')
export class Invoice {
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

  @Column({ type: 'uuid', nullable: true })
  membershipPlanId?: string | null;

  @ManyToOne(() => MembershipPlanDefinitionEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'membershipPlanId' })
  membershipPlan?: MembershipPlanDefinitionEntity | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  membershipPlanName?: string; // Denormalized for easier display

  // Optional: Link back to the payment that settled this invoice
  @Column({ type: 'uuid', nullable: true })
  paymentId?: string | null;

  @OneToOne(() => Payment, (payment) => payment.invoice, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'paymentId' })
  payment?: Payment | null;

  @Column({ type: 'varchar', length: 100, unique: true })
  invoiceNumber: string; // e.g., INV-2023-0001

  @Column({ type: 'date' })
  issueDate: string; // YYYY-MM-DD

  @Column({ type: 'date' })
  dueDate: string; // YYYY-MM-DD

  @Column({ type: 'jsonb', default: () => "'[]'" }) // Array of InvoiceItem objects
  items: InvoiceItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amountDue: number;

  @Column({ type: 'varchar', length: 50, default: 'Draft' })
  status: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_invoice_id',
  })
  stripeInvoiceId?: string; // Store the Stripe Invoice ID for reconciliation

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
