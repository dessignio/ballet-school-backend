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
import { ScheduledClassSlot } from 'src/scheduled-class-slot/scheduled-class-slot.entity';
import { SchoolEvent } from 'src/school-event/school-event.entity';

@Entity('studios')
export class Studio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'owner_id', nullable: true }) // Made nullable for initial creation
  ownerId: string | null;

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

  @Column({ name: 'stripe_customer_id', type: 'varchar', nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ name: 'subscription_status', type: 'varchar', nullable: true })
  subscriptionStatus: string | null;

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

  @OneToMany(() => ScheduledClassSlot, (slot) => slot.studio)
  scheduledClassSlots: ScheduledClassSlot[];

  @OneToMany(() => SchoolEvent, (event) => event.studio)
  schoolEvents: SchoolEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => StripeSettings, (stripeSettings) => stripeSettings.studio)
  stripeSettings: StripeSettings;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
