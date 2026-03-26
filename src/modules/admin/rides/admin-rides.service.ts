import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { RideDetails } from '../../../database/entities/ride-details.entity';
import { RideStatus } from '../../../database/entities/ride-status.entity';
import { RideTracking } from '../../../database/entities/ride-tracking.entity';
import { RideListQueryDto } from './dto/ride-list-query.dto';

export interface RideListItem {
  id: string;
  booking_id: string;
  ride_status: string;
  total_distance_km: number | null;
  total_duration_min: number | null;
  trip_started_at: Date | null;
  trip_completed_at: Date | null;
  booking?: {
    id: string;
    status: string;
    user_id: string;
    pickup_address: string | null;
    drop_address: string | null;
    created_at: Date;
  };
}

export interface RideListResponse {
  data: RideListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface RideDetailResponse {
  id: string;
  booking_id: string;
  total_distance_km: number | null;
  total_duration_min: number | null;
  trip_started_at: Date | null;
  trip_completed_at: Date | null;
  ride_status: string;
  booking: {
    id: string;
    status: string;
    pickup_address: string | null;
    drop_address: string | null;
    user_id: string;
    ambulance_type_id: string;
  };
  ride_tracking: { latitude: number; longitude: number; recorded_at: Date }[];
}

/** Rides are bookings that have reached driver_accepted or beyond (have ride_status) */
@Injectable()
export class AdminRidesService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(RideDetails)
    private readonly rideDetailsRepo: Repository<RideDetails>,
    @InjectRepository(RideStatus)
    private readonly rideStatusRepo: Repository<RideStatus>,
    @InjectRepository(RideTracking)
    private readonly rideTrackingRepo: Repository<RideTracking>,
  ) {}

  async listRides(query: RideListQueryDto): Promise<RideListResponse> {
    const {
      page = 1,
      limit = 20,
      status,
      from,
      to,
      booking_id,
      search,
      zone_id,
    } = query;
    const skip = (page - 1) * limit;

    const qb = this.rideStatusRepo
      .createQueryBuilder('rs')
      .leftJoinAndSelect('rs.booking', 'b')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.ambulance_type', 'at')
      .leftJoinAndSelect('b.ride_details', 'rd')
      .orderBy('rs.updated_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('rs.status = :status', { status });
    }
    if (booking_id) {
      qb.andWhere('rs.booking_id = :booking_id', { booking_id });
    }
    if (zone_id) {
      qb.andWhere('b.zone_id = :zone_id', { zone_id });
    }
    if (from) {
      qb.andWhere('DATE(rs.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(rs.created_at) <= :to', { to });
    }
    if (search) {
      qb.andWhere('(u.mobile_number LIKE :search OR u.name LIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [rideStatuses, total] = await qb.getManyAndCount();

    const data: RideListItem[] = rideStatuses.map((rs) => {
      const rd = rs.booking?.ride_details;
      return {
        id: rs.id,
        booking_id: rs.booking_id,
        ride_status: rs.status,
        total_distance_km:
          rd?.total_distance_km != null ? Number(rd.total_distance_km) : null,
        total_duration_min: rd?.total_duration_min ?? null,
        trip_started_at: rd?.trip_started_at ?? null,
        trip_completed_at: rd?.trip_completed_at ?? null,
        booking: rs.booking
          ? {
              id: rs.booking.id,
              status: rs.booking.status,
              user_id: rs.booking.user_id,
              pickup_address: rs.booking.pickup_address,
              drop_address: rs.booking.drop_address,
              created_at: rs.booking.created_at,
            }
          : undefined,
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getRideById(id: string): Promise<RideDetailResponse> {
    let rideStatus = await this.rideStatusRepo.findOne({
      where: { id },
      relations: ['booking'],
    });
    if (!rideStatus) {
      rideStatus = await this.rideStatusRepo.findOne({
        where: { booking_id: id },
        relations: ['booking'],
      });
    }
    if (!rideStatus) {
      throw new NotFoundException('Ride not found');
    }

    const [rideDetails, rideTracking] = await Promise.all([
      this.rideDetailsRepo.findOne({
        where: { booking_id: rideStatus.booking_id },
      }),
      this.rideTrackingRepo.find({
        where: { booking_id: rideStatus.booking_id },
        order: { recorded_at: 'ASC' },
      }),
    ]);

    return {
      id: rideStatus.id,
      booking_id: rideStatus.booking_id,
      total_distance_km:
        rideDetails?.total_distance_km != null
          ? Number(rideDetails.total_distance_km)
          : null,
      total_duration_min: rideDetails?.total_duration_min ?? null,
      trip_started_at: rideDetails?.trip_started_at ?? null,
      trip_completed_at: rideDetails?.trip_completed_at ?? null,
      ride_status: rideStatus.status,
      booking: rideStatus.booking
        ? {
            id: rideStatus.booking.id,
            status: rideStatus.booking.status,
            pickup_address: rideStatus.booking.pickup_address,
            drop_address: rideStatus.booking.drop_address,
            user_id: rideStatus.booking.user_id,
            ambulance_type_id: rideStatus.booking.ambulance_type_id,
          }
        : {
            id: '',
            status: '',
            pickup_address: null,
            drop_address: null,
            user_id: '',
            ambulance_type_id: '',
          },
      ride_tracking: rideTracking.map((rt) => ({
        latitude: Number(rt.latitude),
        longitude: Number(rt.longitude),
        recorded_at: rt.recorded_at,
      })),
    };
  }

  async getRideByBookingId(bookingId: string): Promise<RideDetailResponse> {
    const rideStatus = await this.rideStatusRepo.findOne({
      where: { booking_id: bookingId },
      relations: ['booking'],
    });
    if (!rideStatus) {
      throw new NotFoundException('Ride not found for this booking');
    }
    return this.getRideById(rideStatus.id);
  }
}
