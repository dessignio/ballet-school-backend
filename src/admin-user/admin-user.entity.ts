/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/admin-user/admin-user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUserStatus } from './types/admin-user-status.type';
import { Studio } from '../studio/studio.entity';

@Unique(['username', 'studioId'])
@Unique(['email', 'studioId'])
@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @ManyToOne(() => Studio, (studio) => studio.adminUsers)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ length: 100 })
  username: string;

  @Column({ length: 100 })
  email: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 255, select: false }) // select: false to not return by default
  password: string;

  @Column({ type: 'uuid' })
  roleId: string;
  // In a full setup, this would be:
  // @ManyToOne(() => Role)
  // @JoinColumn({ name: 'roleId' })
  // role: Role;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: AdminUserStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
  name: string;
  role: import('src/role/role.entity.ts').Role;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  // Optional: Method to validate password (useful in auth strategies)
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
