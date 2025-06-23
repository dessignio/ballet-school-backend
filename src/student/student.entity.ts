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
} from 'typeorm';
import * as bcrypt from 'bcrypt';

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
export type MembershipPlan =
  | 'Basic'
  | 'Basic Plus'
  | 'Pro'
  | 'Ultra'
  | 'Complete';
export type StudentStatus = 'Activo' | 'Inactivo' | 'Suspendido';

// Interface para los objetos JSON anidados
interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true }) // Optional username
  username?: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gender: Gender;

  @Column({ type: 'text', nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false }) // Password, not selected by default
  password: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  emergencyContact: EmergencyContact;

  @Column({ type: 'jsonb', nullable: true })
  address: Address;

  @Column({ type: 'varchar', length: 100, nullable: true })
  program: ProgramName | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dancerLevel: DancerLevelName | null;

  @Column({ type: 'text', array: true, default: () => 'ARRAY[]::text[]' })
  enrolledClasses: string[];

  @Column({ type: 'varchar', length: 50 })
  membershipType: MembershipPlan;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  renewalDate: string;

  @Column({ type: 'varchar', length: 50, default: 'Activo' })
  status: StudentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  personalGoals: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash if password is provided and is not already hashed (simple check, improve if needed)
    // This check is basic. A more robust way is to check if it looks like a bcrypt hash.
    // For new entities or when password is explicitly changed, this.password will be plain text.
    if (this.password && !this.password.startsWith('$2b$')) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  // Optional: Method to validate password (useful in auth strategies)
  async validatePassword(password: string): Promise<boolean> {
    if (!this.password) return false; // No password set
    return bcrypt.compare(password, this.password);
  }
}
