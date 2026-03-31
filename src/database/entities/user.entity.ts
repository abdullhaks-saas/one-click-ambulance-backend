import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mobile_number: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  /** OTP lives in Redis (see AuthService); not stored on this row. */

  @Column({ nullable: true })
  profile_photo_url: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ nullable: true })
  fcm_token: string;

  @Column({ nullable: true })
  device_id: string;

  @Column({ type: 'timestamp', nullable: true })
  fraud_flagged_at: Date | null;

  @Column({ type: 'text', nullable: true })
  fraud_flag_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
