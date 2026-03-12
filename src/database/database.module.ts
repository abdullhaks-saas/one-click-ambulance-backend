import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Driver } from './entities/driver.entity';
import { AdminUser } from './entities/admin-user.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Driver, AdminUser, AuditLog])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
