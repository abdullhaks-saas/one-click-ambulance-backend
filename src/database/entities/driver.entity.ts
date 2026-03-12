import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

export enum DriverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mobile_number: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.PENDING })
  status: DriverStatus;

  @Column({ type: 'enum', enum: Role, default: Role.DRIVER })
  role: Role;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  total_rides: number;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_online: boolean;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ nullable: true })
  fcm_token: string;

  @Column({ nullable: true })
  device_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
