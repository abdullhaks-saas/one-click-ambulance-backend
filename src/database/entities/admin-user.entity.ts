import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  SUPPORT = 'support',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.SUPPORT })
  admin_role: AdminRole;

  @Column({ type: 'enum', enum: Role, default: Role.ADMIN })
  role: Role;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  last_login: Date;

  @CreateDateColumn()
  created_at: Date;
}
