import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Driver } from './driver.entity';
import { AmbulanceType } from './ambulance-type.entity';
import { AmbulanceEquipment } from './ambulance-equipment.entity';

export enum AmbulanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
}

@Entity('ambulances')
export class Ambulance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver_id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column()
  ambulance_type_id: string;

  @ManyToOne(() => AmbulanceType)
  @JoinColumn({ name: 'ambulance_type_id' })
  ambulance_type: AmbulanceType;

  @Column()
  registration_number: string;

  @Column({ nullable: true })
  vehicle_number: string;

  @Column({ nullable: true })
  photo_url: string;

  @Column({ type: 'date', nullable: true })
  insurance_expiry: Date;

  @Column({
    type: 'enum',
    enum: AmbulanceStatus,
    default: AmbulanceStatus.PENDING,
  })
  status: AmbulanceStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  suspend_reason: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => AmbulanceEquipment, (equip) => equip.ambulance)
  equipment: AmbulanceEquipment[];
}
