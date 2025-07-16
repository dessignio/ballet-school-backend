// src/membership-plan/membership-plan.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MembershipPlanName } from './types/membership-plan-name.type'; // This type is now 'string'
import { Studio } from '../studio/studio.entity';

@Entity('membership_plans')
export class MembershipPlanDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.membershipPlans)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
  })
  name: MembershipPlanName;

  @Column({ type: 'int' })
  classesPerWeek: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'int', nullable: true })
  durationMonths?: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_price_id',
  })
  stripePriceId?: string; // Stripe Price ID (e.g., price_xxxxxxxxxxxxxx)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
