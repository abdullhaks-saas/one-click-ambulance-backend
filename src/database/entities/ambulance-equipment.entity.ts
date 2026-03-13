import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ambulance } from './ambulance.entity';

@Entity('ambulance_equipment')
export class AmbulanceEquipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ambulance_id: string;

  @ManyToOne(() => Ambulance, (ambulance) => ambulance.equipment, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ambulance_id' })
  ambulance: Ambulance;

  @Column()
  name: string;

  @CreateDateColumn()
  created_at: Date;
}
