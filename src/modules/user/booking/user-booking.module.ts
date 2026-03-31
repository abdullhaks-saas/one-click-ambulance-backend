import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '../../../shared/http/http.module';
import { PricingRule } from '../../../database/entities/pricing-rule.entity';
import { AmbulanceType } from '../../../database/entities/ambulance-type.entity';
import { Booking } from '../../../database/entities/booking.entity';
import { BookingStatusHistory } from '../../../database/entities/booking-status-history.entity';
import { User } from '../../../database/entities/user.entity';
import { Zone } from '../../../database/entities/zone.entity';
import { DispatchModule } from '../../dispatch/dispatch.module';
import { UserBookingService } from './user-booking.service';
import { UserBookingController } from './user-booking.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PricingRule,
      AmbulanceType,
      Booking,
      BookingStatusHistory,
      User,
      Zone,
    ]),
    HttpModule,
    DispatchModule,
  ],
  controllers: [UserBookingController],
  providers: [UserBookingService],
})
export class UserBookingModule {}
