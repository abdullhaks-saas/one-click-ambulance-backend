import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Notification } from './notification.entity';

export enum NotificationRecipientType {
  DRIVER = 'driver',
  USER = 'user',
}

export enum NotificationDeliveryStatus {
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  notification_id: string | null;

  @ManyToOne(() => Notification, (n) => n.logs, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'notification_id' })
  notification: Notification | null;

  @Column({ type: 'varchar', length: 20 })
  recipient_type: NotificationRecipientType;

  @Column({ type: 'varchar', length: 36, nullable: true })
  recipient_id: string | null;

  @Column({ type: 'text', nullable: true })
  fcm_token: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: NotificationDeliveryStatus.FAILED,
  })
  status: NotificationDeliveryStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn()
  created_at: Date;
}
