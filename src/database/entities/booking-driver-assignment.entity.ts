import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Driver } from './driver.entity';

@Entity('booking_driver_assignments')
export class BookingDriverAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  booking_id: string;

  @ManyToOne(() => Booking, (b) => b.driver_assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ type: 'timestamp' })
  assigned_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date;

  @Column({ length: 500, nullable: true })
  rejection_reason: string;

  @Column({ default: true })
  is_current: boolean;

  @Column({ type: 'timestamp', nullable: true })
  timeout_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
