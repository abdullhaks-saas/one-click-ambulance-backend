import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { DriverBankAccount } from './driver-bank-account.entity';
import { PayoutTransaction } from './payout-transaction.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column({ nullable: true })
  driver_bank_account_id: string;

  @ManyToOne(() => DriverBankAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'driver_bank_account_id' })
  driver_bank_account: DriverBankAccount;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'INR' })
  currency: string;

  @Column({ length: 50, default: PayoutStatus.PENDING })
  status: PayoutStatus | string;

  @Column({ type: 'date', nullable: true })
  period_start: Date | null;

  @Column({ type: 'date', nullable: true })
  period_end: Date | null;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @OneToMany(() => PayoutTransaction, (t) => t.payout)
  payout_transactions: PayoutTransaction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
