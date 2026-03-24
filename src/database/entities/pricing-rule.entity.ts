import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AmbulanceType } from './ambulance-type.entity';

@Entity('pricing_rules')
export class PricingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ambulance_type_id: string;

  @ManyToOne(() => AmbulanceType, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ambulance_type_id' })
  ambulance_type: AmbulanceType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  base_fare: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  per_km_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  emergency_charge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  night_charge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimum_fare: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
