import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Booking } from './booking.entity';

@Entity('ride_details')
export class RideDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  booking_id: string;

  @OneToOne(() => Booking, (b) => b.ride_details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  total_distance_km: number;

  @Column({ type: 'int', nullable: true })
  total_duration_min: number;

  @Column({ type: 'timestamp', nullable: true })
  trip_started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  trip_completed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
