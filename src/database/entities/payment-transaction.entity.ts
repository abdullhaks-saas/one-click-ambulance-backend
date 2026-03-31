import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum PaymentTransactionKind {
  RECONCILE = 'reconcile',
  RETRY_STATUS = 'retry_status',
  /** Customer app signature verification (Phase I). */
  VERIFY = 'verify',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payment_id: string;

  @ManyToOne(() => Payment, (p) => p.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ length: 50 })
  kind: PaymentTransactionKind | string;

  @Column({ length: 255, nullable: true })
  razorpay_payment_id: string;

  @Column({ length: 50, nullable: true })
  remote_status: string;

  @Column({ type: 'json', nullable: true })
  payload: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;
}
