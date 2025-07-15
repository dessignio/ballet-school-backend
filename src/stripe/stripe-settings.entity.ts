import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { Studio } from '../studio/studio.entity';

@Entity('stripe_settings')
export class StripeSettings {
  @PrimaryColumn({ type: 'uuid', name: 'studio_id' })
  studioId: string;

  @OneToOne(() => Studio)
  @JoinColumn({ name: 'studio_id' })
  studio: Studio;

  @Column({ type: 'varchar', length: 255, nullable: true })
  enrollmentProductId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  enrollmentPriceId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  auditionProductId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  auditionPriceId: string;
}
