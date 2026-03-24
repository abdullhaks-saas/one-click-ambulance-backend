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
import { Zone } from './entities/zone.entity';
import { ZoneCoordinate } from './entities/zone-coordinate.entity';
import { DriverStatusEntity } from './entities/driver-status.entity';
import { DriverLocation } from './entities/driver-location.entity';
import { DriverZone } from './entities/driver-zone.entity';
import { Booking } from './entities/booking.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { BookingDriverAssignment } from './entities/booking-driver-assignment.entity';
import { RideDetails } from './entities/ride-details.entity';
import { RideStatus } from './entities/ride-status.entity';
import { RideTracking } from './entities/ride-tracking.entity';
import { Payment } from './entities/payment.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { DriverWallet } from './entities/driver-wallet.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Payout } from './entities/payout.entity';
import { PayoutTransaction } from './entities/payout-transaction.entity';
import { PricingRule } from './entities/pricing-rule.entity';

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
      Zone,
      ZoneCoordinate,
      DriverStatusEntity,
      DriverLocation,
      DriverZone,
      Booking,
      BookingStatusHistory,
      BookingDriverAssignment,
      RideDetails,
      RideStatus,
      RideTracking,
      Payment,
      PaymentTransaction,
      DriverWallet,
      WalletTransaction,
      Payout,
      PayoutTransaction,
      PricingRule,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
