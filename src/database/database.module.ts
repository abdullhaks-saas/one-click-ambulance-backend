import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Driver } from './entities/driver.entity';
import { AdminUser } from './entities/admin-user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { DriverDocument } from './entities/driver-document.entity';
import { DriverBankAccount } from './entities/driver-bank-account.entity';
import { AmbulanceType } from './entities/ambulance-type.entity';
import { Ambulance } from './entities/ambulance.entity';
import { AmbulanceEquipment } from './entities/ambulance-equipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Driver,
      AdminUser,
      AuditLog,
      DriverDocument,
      DriverBankAccount,
      AmbulanceType,
      Ambulance,
      AmbulanceEquipment,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
