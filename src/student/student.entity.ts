/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
// src/student/student.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MembershipPlanDefinitionEntity } from 'src/membership-plan/membership-plan.entity';
import { Parent } from 'src/parent/parent.entity';
import { Studio } from '../studio/studio.entity';

// Definimos tipos que podrían ser ENUMs en la base de datos o simplemente strings validados.
export type Gender = 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo';
// ProgramName and DancerLevelName might be sourced from Program entity in a more advanced setup
export type ProgramName = 'New Stars' | 'Little Giants' | 'Dancers' | string; // Allow string for flexibility
export type DancerLevelName =
  | 'Explorer 1'
  | 'Explorer 2'
  | 'Explorer 3'
  | 'Deep'
  | string; // Allow string for flexibility
export type StudentStatus = 'Activo' | 'Inactivo' | 'Suspendido';

// Interface para los objetos JSON anidados
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export type StripeSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | null;

@Unique(['username', 'studioId'])
@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.students)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string; // Store as string "YYYY-MM-DD" for simplicity with date inputs

  @Column({ type: 'varchar', length: 50, nullable: true })
  gender: Gender;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl?: string; // Changed from profilePictureUrl: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string; // Changed from phone: string

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact?: EmergencyContact; // Changed from emergencyContact: EmergencyContact

  @Column({ type: 'jsonb', nullable: true })
  address?: Address; // Changed from address: Address

  @Column({ type: 'varchar', length: 100, nullable: true })
  program: ProgramName | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dancerLevel: DancerLevelName | null;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" }) // Corrected default for PostgreSQL
  enrolledClasses: string[];

  // This field is derived by the backend based on membershipPlanId.
  // It's the name of the plan.
  @Column({ type: 'varchar', length: 100, nullable: true })
  membershipType: string | null;

  @Column({ type: 'uuid', nullable: true })
  membershipPlanId: string | null;

  // Optional: Define relation if you want to easily access plan details from student
  @ManyToOne(() => MembershipPlanDefinitionEntity, {
    nullable: true,
    eager: false,
  }) // eager: false to avoid auto-loading
  @JoinColumn({ name: 'membershipPlanId' })
  membershipPlan?: MembershipPlanDefinitionEntity;

  @Column({ type: 'date', nullable: true })
  membershipStartDate: string | null; // Store as string "YYYY-MM-DD"

  // This field is derived by the backend.
  @Column({ type: 'date', nullable: true })
  membershipRenewalDate: string | null; // Store as string "YYYY-MM-DD"

  @Column({ type: 'varchar', length: 255, nullable: true })
  membershipPlanName?: string;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string; // Changed from notes: string

  @Column({ type: 'text', nullable: true })
  personalGoals?: string; // Changed from personalGoals: string

  // Stripe specific fields
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_customer_id',
  })
  stripeCustomerId?: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_subscription_id',
  })
  stripeSubscriptionId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'stripe_subscription_status',
  })
  stripeSubscriptionStatus?: StripeSubscriptionStatus;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  // parentName is for denormalized data for easier frontend display
  @Column({ type: 'varchar', length: 255, nullable: true })
  parentName?: string;

  @ManyToOne(() => Parent, (parent) => parent.students, {
    nullable: true,
    onDelete: 'SET NULL', // If parent is deleted, set parentId to null in student
  })
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(password, this.password);
  }
}
