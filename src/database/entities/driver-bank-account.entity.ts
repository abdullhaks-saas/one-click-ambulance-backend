import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';

@Entity('driver_bank_accounts')
export class DriverBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column()
  bank_name: string;

  @Column()
  account_number: string;

  @Column()
  ifsc_code: string;

  @Column({ nullable: true })
  account_holder_name: string;

  @CreateDateColumn()
  created_at: Date;
}
