import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Studio } from '../studio/studio.entity';

export type ProspectStatus = 'PENDING_EVALUATION' | 'CONVERTED' | 'REJECTED';

@Entity('prospects')
export class Prospect {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.prospects)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'date' })
  dateOfBirth: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: ['PENDING_EVALUATION', 'CONVERTED', 'REJECTED'],
    default: 'PENDING_EVALUATION',
  })
  status: ProspectStatus;

  @Column({ type: 'varchar', length: 255 })
  auditionPaymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
