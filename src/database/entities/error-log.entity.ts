import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('error_logs')
export class ErrorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, default: 'error' })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'text', nullable: true })
  stack: string | null;

  @Column({ type: 'json', nullable: true })
  context: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @CreateDateColumn()
  created_at: Date;
}
