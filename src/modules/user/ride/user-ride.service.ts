import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';
import { RideDetails } from '../../../database/entities/ride-details.entity';
import { RideStatus } from '../../../database/entities/ride-status.entity';
import { RideOtp } from '../../../database/entities/ride-otp.entity';
import { BookingStatusHistory } from '../../../database/entities/booking-status-history.entity';
import { RideTracking } from '../../../database/entities/ride-tracking.entity';

/** Booking statuses where a ride OTP can be generated (driver assigned/arrived). */
const OTP_ELIGIBLE_STATUSES: string[] = [
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_ON_WAY,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.PATIENT_ONBOARD,
];

const LIVE_TRACKING_STATUSES: string[] = [
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_ON_WAY,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.PATIENT_ONBOARD,
  BookingStatus.TRIP_STARTED,
];

function generateNumericOtp(length = 4): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

@Injectable()
export class UserRideService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(RideDetails)
    private readonly rideDetailsRepo: Repository<RideDetails>,
    @InjectRepository(RideStatus)
    private readonly rideStatusRepo: Repository<RideStatus>,
    @InjectRepository(RideOtp)
    private readonly rideOtpRepo: Repository<RideOtp>,
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepo: Repository<BookingStatusHistory>,
    @InjectRepository(RideTracking)
    private readonly rideTrackingRepo: Repository<RideTracking>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /ride/details — ride_details + booking core info for the passenger.
   */
  async getDetails(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
      relations: {
        ambulance_type: true,
        ride_details: true,
        driver_assignments: { driver: true },
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const currentAssignment = (booking.driver_assignments ?? [])
      .filter((a) => a.is_current && a.accepted_at)
      .sort(
        (a, b) => b.assigned_at.getTime() - a.assigned_at.getTime(),
      )[0];

    return {
      booking_id: booking.id,
      status: booking.status,
      ambulance_type: booking.ambulance_type
        ? { id: booking.ambulance_type.id, name: booking.ambulance_type.name }
        : null,
      pickup: {
        latitude: Number(booking.pickup_latitude),
        longitude: Number(booking.pickup_longitude),
        address: booking.pickup_address,
      },
      drop: {
        latitude: Number(booking.drop_latitude),
        longitude: Number(booking.drop_longitude),
        address: booking.drop_address,
      },
      estimated_fare:
        booking.estimated_fare != null ? Number(booking.estimated_fare) : null,
      final_fare:
        booking.final_fare != null ? Number(booking.final_fare) : null,
      is_emergency: booking.is_emergency,
      driver: currentAssignment?.driver
        ? {
            id: currentAssignment.driver.id,
            name: currentAssignment.driver.name,
            mobile_number: currentAssignment.driver.mobile_number,
            profile_photo: currentAssignment.driver.profile_photo ?? null,
          }
        : null,
      ride_details: booking.ride_details
        ? {
            id: booking.ride_details.id,
            total_distance_km:
              booking.ride_details.total_distance_km != null
                ? Number(booking.ride_details.total_distance_km)
                : null,
            total_duration_min: booking.ride_details.total_duration_min ?? null,
            trip_started_at: booking.ride_details.trip_started_at ?? null,
            trip_completed_at: booking.ride_details.trip_completed_at ?? null,
          }
        : null,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
    };
  }

  /**
   * GET /ride/status — current ride_status + full status timeline.
   */
  async getStatus(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
      relations: { ride_status: true },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const history = await this.statusHistoryRepo.find({
      where: { booking_id: bookingId },
      order: { created_at: 'ASC' },
      take: 50,
    });

    return {
      booking_id: booking.id,
      booking_status: booking.status,
      ride_status: booking.ride_status
        ? {
            id: booking.ride_status.id,
            status: booking.ride_status.status,
            updated_at: booking.ride_status.updated_at,
          }
        : null,
      timeline: history.map((h) => ({
        status: h.status,
        created_at: h.created_at,
        metadata: h.metadata,
      })),
    };
  }

  /**
   * GET /ride/generate-otp — create a 4-digit OTP for the booking so the
   * passenger can show it to the driver before the trip starts (§5.7).
   *
   * Idempotent: if an unverified OTP already exists for this booking it is
   * returned instead of creating a new one.
   */
  async generateOtp(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!OTP_ELIGIBLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        `OTP cannot be generated in booking status: ${booking.status}`,
      );
    }

    const existing = await this.rideOtpRepo.findOne({
      where: { booking_id: bookingId, verified: false },
      order: { created_at: 'DESC' },
    });
    if (existing) {
      return {
        booking_id: bookingId,
        otp_code: existing.otp_code,
        verified: existing.verified,
        created_at: existing.created_at,
      };
    }

    const otpCode = generateNumericOtp(4);
    const saved = await this.rideOtpRepo.save(
      this.rideOtpRepo.create({
        booking_id: bookingId,
        otp_code: otpCode,
        verified: false,
      }),
    );

    return {
      booking_id: bookingId,
      otp_code: saved.otp_code,
      verified: saved.verified,
      created_at: saved.created_at,
    };
  }

  /**
   * GET /ride/live-location — latest DB point; optional Firebase RTDB path hint.
   */
  async getLiveLocation(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (!LIVE_TRACKING_STATUSES.includes(booking.status)) {
      throw new BadRequestException(
        'Live location is only available during an active ride',
      );
    }

    const latest = await this.rideTrackingRepo.findOne({
      where: { booking_id: bookingId },
      order: { recorded_at: 'DESC' },
    });

    const firebaseProject = this.configService.get<string>(
      'FIREBASE_PROJECT_ID',
    );
    const rtdbUrl = this.configService.get<string>('FIREBASE_DATABASE_URL');
    const firebase_path_hint =
      firebaseProject && rtdbUrl
        ? `bookings/${bookingId}/driver_location`
        : null;

    return {
      booking_id: bookingId,
      booking_status: booking.status,
      last_point: latest
        ? {
            latitude: Number(latest.latitude),
            longitude: Number(latest.longitude),
            recorded_at: latest.recorded_at,
          }
        : null,
      firebase_path_hint,
    };
  }
}
