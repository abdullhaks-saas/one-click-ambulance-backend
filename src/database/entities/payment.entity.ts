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
import { Booking } from './booking.entity';
import { User } from './user.entity';
import { PaymentTransaction } from './payment-transaction.entity';

export enum PaymentMethod {
  ONLINE = 'online',
  CASH = 'cash',
  WALLET = 'wallet',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  booking_id: string;

  @ManyToOne(() => Booking, (b) => b.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column()
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 255, nullable: true })
  razorpay_order_id: string;

  @Column({ length: 255, nullable: true })
  razorpay_payment_id: string;

  @Column({ length: 50, default: PaymentMethod.ONLINE })
  payment_method: PaymentMethod | string;

  @Column({ length: 50, default: PaymentStatus.PENDING })
  status: PaymentStatus | string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PaymentTransaction, (t) => t.payment)
  transactions: PaymentTransaction[];
}
