// backend/studio/studio.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { AdminUser } from '../admin-user/admin-user.entity';
import { Student } from '../student/student.entity';
import { Instructor } from '../instructor/instructor.entity';
import { Program } from '../program/program.entity';
import { ClassOffering } from '../class-offering/class-offering.entity';
import { MembershipPlanDefinitionEntity } from '../membership-plan/membership-plan.entity';
import { StripeSettings } from '../stripe/stripe-settings.entity';
import { Prospect } from '../prospect/prospect.entity';
import { Role } from '../role/role.entity';
import { Payment } from '../payment/payment.entity';

@Entity('studios')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @OneToOne(() => AdminUser)
  @JoinColumn({ name: 'owner_id' })
  owner: AdminUser;

  @Column({
    name: 'stripe_account_id',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  stripeAccountId: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => AdminUser, (adminUser) => adminUser.studio)
  adminUsers: AdminUser[];

  @OneToMany(() => Student, (student) => student.studio)
  students: Student[];

  @OneToMany(() => Instructor, (instructor) => instructor.studio)
  instructors: Instructor[];

  @OneToMany(() => Program, (program) => program.studio)
  programs: Program[];

  @OneToMany(() => ClassOffering, (classOffering) => classOffering.studio)
  classOfferings: ClassOffering[];

  @OneToMany(() => MembershipPlanDefinitionEntity, (plan) => plan.studio)
  membershipPlans: MembershipPlanDefinitionEntity[];

  @OneToMany(() => Prospect, (prospect) => prospect.studio)
  prospects: Prospect[];

  @OneToMany(() => Role, (role) => role.studio)
  roles: Role[];

  @OneToMany(() => Payment, (payment) => payment.studio)
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => StripeSettings, (stripeSettings) => stripeSettings.studio)
  stripeSettings: StripeSettings;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  scheduledClassSlots: any;
  schoolEvents: any;
}
