// src/role/role.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PermissionKey } from './types/permission-key.type';
import { Studio } from '../studio/studio.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.roles)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'text', // In PostgreSQL, this maps to text[]
    array: true,
    default: () => "'{}'", // Default to an empty array
  })
  permissions: PermissionKey[]; // Ensure this type aligns with what's stored

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
