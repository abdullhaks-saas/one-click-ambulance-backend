import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum AdminAlertType {
  DRIVER_OFFLINE = 'driver_offline',
  LOW_AVAILABILITY = 'low_availability',
  HIGH_CANCELLATION = 'high_cancellation',
  FRAUD_DETECTED = 'fraud_detected',
  SYSTEM = 'system',
}

export enum AdminAlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('admin_alerts')
export class AdminAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  type: AdminAlertType;

  @Column({ length: 20, default: AdminAlertSeverity.INFO })
  severity: AdminAlertSeverity;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ default: false })
  is_read: boolean;

  @Column({ default: false })
  is_dismissed: boolean;

  @CreateDateColumn()
  created_at: Date;
}
