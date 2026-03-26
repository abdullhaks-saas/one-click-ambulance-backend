import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

export enum AppPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Entity('app_versions')
export class AppVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  platform: AppPlatform;

  @Column()
  version: string;

  @Column({ type: 'int', nullable: true })
  build_number: number | null;

  @Column({ default: false })
  mandatory: boolean;

  @Column({ type: 'text', nullable: true })
  release_notes: string | null;

  @UpdateDateColumn()
  updated_at: Date;
}
