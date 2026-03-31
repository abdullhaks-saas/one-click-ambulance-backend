import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_status')
export class DriverStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ default: false })
  is_online: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_seen: Date;

  /** Explicit DB type so MySQL does not infer union `string | null` as Object. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  current_booking_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
