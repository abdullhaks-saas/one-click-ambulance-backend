import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { AmbulanceType } from './ambulance-type.entity';
import { Zone } from './zone.entity';
import { BookingStatusHistory } from './booking-status-history.entity';
import { BookingDriverAssignment } from './booking-driver-assignment.entity';
import { RideDetails } from './ride-details.entity';
import { RideStatus } from './ride-status.entity';
import { RideTracking } from './ride-tracking.entity';
import { Payment } from './payment.entity';

export enum BookingStatus {
  CREATED = 'created',
  SEARCHING = 'searching',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ACCEPTED = 'driver_accepted',
  DRIVER_ON_WAY = 'driver_on_way',
  DRIVER_ARRIVED = 'driver_arrived',
  PATIENT_ONBOARD = 'patient_onboard',
  TRIP_STARTED = 'trip_started',
  TRIP_COMPLETED = 'trip_completed',
  CANCELLED = 'cancelled',
  NO_DRIVER_FOUND = 'no_driver_found',
  FORCE_CANCELLED = 'force_cancelled',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  ambulance_type_id: string;

  @ManyToOne(() => AmbulanceType)
  @JoinColumn({ name: 'ambulance_type_id' })
  ambulance_type: AmbulanceType;

  @Column({ nullable: true })
  zone_id: string;

  @ManyToOne(() => Zone)
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickup_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  pickup_longitude: number;

  @Column({ length: 500, nullable: true })
  pickup_address: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  drop_latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  drop_longitude: number;

  @Column({ length: 500, nullable: true })
  drop_address: string;

  @Column({ length: 50, default: BookingStatus.CREATED })
  status: BookingStatus | string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimated_fare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  final_fare: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimated_distance_km: number;

  @Column({ type: 'int', nullable: true })
  estimated_duration_min: number;

  @Column({ default: false })
  is_emergency: boolean;

  @Column({ length: 500, nullable: true })
  cancellation_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => BookingStatusHistory, (h) => h.booking)
  status_history: BookingStatusHistory[];

  @OneToMany(() => BookingDriverAssignment, (a) => a.booking)
  driver_assignments: BookingDriverAssignment[];

  @OneToOne(() => RideDetails, (rd) => rd.booking)
  ride_details: RideDetails;

  @OneToOne(() => RideStatus, (rs) => rs.booking)
  ride_status: RideStatus;

  @OneToMany(() => RideTracking, (rt) => rt.booking)
  ride_tracking: RideTracking[];

  @OneToMany(() => Payment, (p) => p.booking)
  payments: Payment[];
}
