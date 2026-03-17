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

export enum RideStatusEnum {
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  PATIENT_ONBOARD = 'patient_onboard',
  TRIP_STARTED = 'trip_started',
  TRIP_COMPLETED = 'trip_completed',
}

@Entity('ride_status')
export class RideStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  booking_id: string;

  @OneToOne(() => Booking, (b) => b.ride_status, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ length: 50, default: RideStatusEnum.ACCEPTED })
  status: RideStatusEnum | string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
