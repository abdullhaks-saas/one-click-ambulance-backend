import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TicketMessage } from './ticket-message.entity';

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  user_id: string | null;

  @Column()
  subject: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: SupportTicketStatus.OPEN,
  })
  status: SupportTicketStatus;

  @Column({ length: 20, default: 'normal' })
  priority: string;

  @OneToMany(() => TicketMessage, (m) => m.ticket)
  messages: TicketMessage[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
