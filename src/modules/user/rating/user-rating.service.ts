import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';
import { BookingDriverAssignment } from '../../../database/entities/booking-driver-assignment.entity';
import { RideRating } from '../../../database/entities/ride-rating.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { SubmitRatingDto } from './dto/submit-rating.dto';

@Injectable()
export class UserRatingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingDriverAssignment)
    private readonly assignmentRepo: Repository<BookingDriverAssignment>,
    @InjectRepository(RideRating)
    private readonly ratingRepo: Repository<RideRating>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async submit(userId: string, dto: SubmitRatingDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.booking_id, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== BookingStatus.TRIP_COMPLETED) {
      throw new BadRequestException(
        'You can only rate after the trip is completed',
      );
    }

    const assignment = await this.assignmentRepo.findOne({
      where: {
        booking_id: dto.booking_id,
        is_current: true,
      },
      order: { assigned_at: 'DESC' },
    });
    if (!assignment?.accepted_at) {
      throw new BadRequestException('No accepted driver for this booking');
    }

    try {
      await this.ratingRepo.save(
        this.ratingRepo.create({
          booking_id: dto.booking_id,
          user_id: userId,
          driver_id: assignment.driver_id,
          rating: dto.rating,
          ...(dto.review != null && dto.review !== ''
            ? { review: dto.review }
            : {}),
        }),
      );
    } catch (e) {
      if (e instanceof QueryFailedError) {
        const err = e as QueryFailedError & { code?: string; errno?: number };
        if (
          err.code === 'ER_DUP_ENTRY' ||
          err.code === '23505' ||
          String(err.message).includes('UQ_ride_ratings_booking_id')
        ) {
          throw new ConflictException('You have already rated this ride');
        }
      }
      throw e;
    }

    await this.refreshDriverAverageRating(assignment.driver_id);

    return { message: 'Rating submitted', booking_id: dto.booking_id };
  }

  private async refreshDriverAverageRating(driverId: string) {
    const row = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.driver_id = :driverId', { driverId })
      .getRawOne<{ avg: string | null; cnt: string }>();

    const avg = row?.avg != null ? Number(row.avg) : 0;
    await this.driverRepo.update(driverId, { rating: avg });
  }
}
