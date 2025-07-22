// src/general-settings/general-settings.entity.ts
import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

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
  // Use a fixed ID since there will only ever be one row of settings
  @PrimaryColumn({ type: 'varchar', default: 'current_settings' })
  id: string;

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
