import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ZoneCoordinate } from './zone-coordinate.entity';
import { DriverZone } from './driver-zone.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  zone_name: string;

  @Column({ nullable: true })
  city: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ZoneCoordinate, (zc) => zc.zone)
  coordinates: ZoneCoordinate[];

  @OneToMany(() => DriverZone, (dz) => dz.zone)
  driver_zones: DriverZone[];
}
