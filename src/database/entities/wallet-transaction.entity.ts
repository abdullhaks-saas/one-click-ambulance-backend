import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { Booking } from './booking.entity';
import { Payment } from './payment.entity';
import { Payout } from './payout.entity';

export enum WalletTransactionType {
  DRIVER_COMMISSION_CREDIT = 'driver_commission_credit',
  PAYOUT_DEBIT = 'payout_debit',
  ADJUSTMENT_CREDIT = 'adjustment_credit',
  ADJUSTMENT_DEBIT = 'adjustment_debit',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ length: 50 })
  transaction_type: WalletTransactionType | string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  booking_id: string;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ nullable: true })
  payment_id: string;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ nullable: true })
  payout_id: string;

  @ManyToOne(() => Payout, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payout_id' })
  payout: Payout;

  @Column({ length: 255, nullable: true })
  reference: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  balance_after: number;

  @CreateDateColumn()
  created_at: Date;
}
