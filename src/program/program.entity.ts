// src/program/program.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
// ProgramName and DancerLevelName types are now just 'string', so direct import might not be needed
// if used just as 'string'. If you had specific string literal types, they've been broadened.

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    nullable: false, // Explicitly set to NOT NULL
  })
  name: string; // Was ProgramName, now just string

  @Column({ length: 255 })
  ageRange: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  hasLevels: boolean;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  levels?: string[]; // Was DancerLevelName[], now string[]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
