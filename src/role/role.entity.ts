// src/role/role.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PermissionKey } from './types/permission-key.type'; // Using the defined type

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
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
