import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupportTicket } from './support-ticket.entity';

@Entity('ticket_messages')
export class TicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  ticket_id: string;

  @ManyToOne(() => SupportTicket, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: SupportTicket;

  @Column({ type: 'varchar', length: 36, nullable: true })
  admin_id: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ default: false })
  is_from_admin: boolean;

  @CreateDateColumn()
  created_at: Date;
}
