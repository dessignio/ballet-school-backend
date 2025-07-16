// src/general-settings/general-settings.entity.ts
import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Studio } from '../studio/studio.entity';

// Define interfaces for JSONB columns to ensure type safety
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface BusinessHour {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

@Entity('general_settings')
export class GeneralSettings {
  @PrimaryColumn({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @OneToOne(() => Studio)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'varchar', length: 255 })
  academyName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', length: 255 })
  contactEmail: string;

  @Column({ type: 'jsonb' })
  address: Address;

  // Storing as text allows for both URLs and base64 strings
  @Column({ type: 'text', nullable: true })
  logoUrl: string;

  @Column({ type: 'jsonb' })
  businessHours: BusinessHour[];

  @UpdateDateColumn()
  updatedAt: Date;
}
