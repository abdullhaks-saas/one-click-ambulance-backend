import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { BookingDriverAssignment } from '../../../database/entities/booking-driver-assignment.entity';
import { RideRating } from '../../../database/entities/ride-rating.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { UserRatingController } from './user-rating.controller';
import { UserRatingService } from './user-rating.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingDriverAssignment,
      RideRating,
      Driver,
    ]),
  ],
  controllers: [UserRatingController],
  providers: [UserRatingService],
})
export class UserRatingModule {}
