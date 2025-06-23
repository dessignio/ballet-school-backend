import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MembershipPlanName } from './types/membership-plan-name.type'; // This type is now 'string'

@Entity('membership_plans')
export class MembershipPlanDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar', // Changed from enum
    length: 100, // Added length
    unique: true,
  })
  name: MembershipPlanName; // This type is now 'string'

  @Column({ type: 'int' })
  classesPerWeek: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPrice: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
