import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  admin_id: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  entity_type: string;

  @Column({ nullable: true })
  entity_id: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ nullable: true })
  ip_address: string;

  @CreateDateColumn()
  created_at: Date;
}
