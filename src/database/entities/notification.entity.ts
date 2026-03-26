import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AdminUser } from './admin-user.entity';
import { NotificationLog } from './notification-log.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'json', nullable: true })
  data: Record<string, string> | null;

  @Column({ length: 50 })
  audience: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  created_by_admin_id: string | null;

  @ManyToOne(() => AdminUser, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_admin_id' })
  created_by_admin: AdminUser | null;

  @OneToMany(() => NotificationLog, (l) => l.notification)
  logs: NotificationLog[];

  @CreateDateColumn()
  created_at: Date;
}
