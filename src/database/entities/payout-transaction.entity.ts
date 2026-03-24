import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payout } from './payout.entity';

@Entity('payout_transactions')
export class PayoutTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payout_id: string;

  @ManyToOne(() => Payout, (p) => p.payout_transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payout_id' })
  payout: Payout;

  @Column({ length: 50 })
  step: string;

  @Column({ length: 255, nullable: true })
  external_reference: string;

  @Column({ type: 'json', nullable: true })
  response: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
