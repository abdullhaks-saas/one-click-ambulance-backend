import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Booking } from '../../../database/entities/booking.entity';
import { RideDetails } from '../../../database/entities/ride-details.entity';
import { RideStatus } from '../../../database/entities/ride-status.entity';
import { RideOtp } from '../../../database/entities/ride-otp.entity';
import { BookingStatusHistory } from '../../../database/entities/booking-status-history.entity';
import { RideTracking } from '../../../database/entities/ride-tracking.entity';
import { UserRideService } from './user-ride.service';
import { UserRideController } from './user-ride.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Booking,
      RideDetails,
      RideStatus,
      RideOtp,
      BookingStatusHistory,
      RideTracking,
    ]),
  ],
  controllers: [UserRideController],
  providers: [UserRideService],
})
export class UserRideModule {}
