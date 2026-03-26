import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 191 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn()
  updated_at: Date;
}
