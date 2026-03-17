import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Zone } from './zone.entity';

@Entity('zone_coordinates')
export class ZoneCoordinate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  zone_id: string;

  @ManyToOne(() => Zone, (z) => z.coordinates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ default: 0 })
  sequence_order: number;

  @CreateDateColumn()
  created_at: Date;
}
