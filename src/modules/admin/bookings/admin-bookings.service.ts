import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { BookingStatus } from '../../../database/entities/booking.entity';
import { BookingStatusHistory } from '../../../database/entities/booking-status-history.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { BookingListQueryDto } from './dto/booking-list-query.dto';

export interface BookingListResponse {
  data: BookingListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface BookingListItem {
  id: string;
  user_id: string;
  ambulance_type_id: string;
  zone_id: string | null;
  status: string;
  estimated_fare: number | null;
  final_fare: number | null;
  is_emergency: boolean;
  created_at: Date;
  user?: { id: string; name: string | null; mobile_number: string };
  ambulance_type?: { id: string; name: string };
  zone?: { id: string; zone_name: string } | null;
}

export interface BookingDetailResponse {
  id: string;
  user_id: string;
  ambulance_type_id: string;
  zone_id: string | null;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: string | null;
  drop_latitude: number;
  drop_longitude: number;
  drop_address: string | null;
  status: string;
  estimated_fare: number | null;
  final_fare: number | null;
  estimated_distance_km: number | null;
  estimated_duration_min: number | null;
  is_emergency: boolean;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
  user?: { id: string; name: string | null; mobile_number: string; email: string | null };
  ambulance_type?: { id: string; name: string };
  zone?: { id: string; zone_name: string } | null;
  status_history?: { id: string; status: string; created_at: Date }[];
  ride_details?: {
    id: string;
    total_distance_km: number | null;
    total_duration_min: number | null;
    trip_started_at: Date | null;
    trip_completed_at: Date | null;
  } | null;
  payments?: { id: string; amount: number; status: string; razorpay_payment_id: string | null }[];
  driver_assignments?: { id: string; driver_id: string; assigned_at: Date; accepted_at: Date | null }[];
}

@Injectable()
export class AdminBookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepo: Repository<BookingStatusHistory>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async listBookings(query: BookingListQueryDto): Promise<BookingListResponse> {
    const { page = 1, limit = 20, status, from, to, zone_id, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.ambulance_type', 'at')
      .leftJoinAndSelect('b.zone', 'z')
      .orderBy('b.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('b.status = :status', { status });
    }
    if (zone_id) {
      qb.andWhere('b.zone_id = :zone_id', { zone_id });
    }
    if (from) {
      qb.andWhere('DATE(b.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(b.created_at) <= :to', { to });
    }
    if (search) {
      qb.andWhere(
        '(u.mobile_number LIKE :search OR u.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((b) => ({
        id: b.id,
        user_id: b.user_id,
        ambulance_type_id: b.ambulance_type_id,
        zone_id: b.zone_id,
        status: b.status,
        estimated_fare: b.estimated_fare != null ? Number(b.estimated_fare) : null,
        final_fare: b.final_fare != null ? Number(b.final_fare) : null,
        is_emergency: b.is_emergency,
        created_at: b.created_at,
        user: b.user
          ? { id: b.user.id, name: b.user.name, mobile_number: b.user.mobile_number }
          : undefined,
        ambulance_type: b.ambulance_type
          ? { id: b.ambulance_type.id, name: b.ambulance_type.name }
          : undefined,
        zone: b.zone ? { id: b.zone.id, zone_name: b.zone.zone_name } : undefined,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(id: string): Promise<BookingDetailResponse> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: ['user', 'ambulance_type', 'zone', 'status_history', 'ride_details', 'payments', 'driver_assignments'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return {
      id: booking.id,
      user_id: booking.user_id,
      ambulance_type_id: booking.ambulance_type_id,
      zone_id: booking.zone_id,
      pickup_latitude: Number(booking.pickup_latitude),
      pickup_longitude: Number(booking.pickup_longitude),
      pickup_address: booking.pickup_address,
      drop_latitude: Number(booking.drop_latitude),
      drop_longitude: Number(booking.drop_longitude),
      drop_address: booking.drop_address,
      status: booking.status,
      estimated_fare: booking.estimated_fare != null ? Number(booking.estimated_fare) : null,
      final_fare: booking.final_fare != null ? Number(booking.final_fare) : null,
      estimated_distance_km: booking.estimated_distance_km != null ? Number(booking.estimated_distance_km) : null,
      estimated_duration_min: booking.estimated_duration_min,
      is_emergency: booking.is_emergency,
      cancellation_reason: booking.cancellation_reason,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      user: booking.user
        ? { id: booking.user.id, name: booking.user.name, mobile_number: booking.user.mobile_number, email: booking.user.email }
        : undefined,
      ambulance_type: booking.ambulance_type
        ? { id: booking.ambulance_type.id, name: booking.ambulance_type.name }
        : undefined,
      zone: booking.zone ? { id: booking.zone.id, zone_name: booking.zone.zone_name } : undefined,
      status_history: booking.status_history?.map((h) => ({ id: h.id, status: h.status, created_at: h.created_at })),
      ride_details: booking.ride_details
        ? {
            id: booking.ride_details.id,
            total_distance_km: booking.ride_details.total_distance_km != null ? Number(booking.ride_details.total_distance_km) : null,
            total_duration_min: booking.ride_details.total_duration_min,
            trip_started_at: booking.ride_details.trip_started_at,
            trip_completed_at: booking.ride_details.trip_completed_at,
          }
        : null,
      payments: booking.payments?.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        razorpay_payment_id: p.razorpay_payment_id,
      })),
      driver_assignments: booking.driver_assignments?.map((a) => ({
        id: a.id,
        driver_id: a.driver_id,
        assigned_at: a.assigned_at,
        accepted_at: a.accepted_at,
      })),
    };
  }

  async forceCancelRide(
    bookingId: string,
    adminId: string,
    reason?: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const cancellableStatuses: string[] = [
      BookingStatus.SEARCHING,
      BookingStatus.DRIVER_ASSIGNED,
      BookingStatus.DRIVER_ACCEPTED,
      BookingStatus.DRIVER_ON_WAY,
      BookingStatus.DRIVER_ARRIVED,
      BookingStatus.PATIENT_ONBOARD,
      BookingStatus.TRIP_STARTED,
    ];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Cannot force cancel booking with status: ${booking.status}. Only active rides can be force cancelled.`,
      );
    }

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.FORCE_CANCELLED,
      cancellation_reason: reason ?? 'Force cancelled by admin',
    });

    await this.statusHistoryRepo.insert({
      booking_id: bookingId,
      status: BookingStatus.FORCE_CANCELLED,
      metadata: reason ? { reason } : undefined,
    });

    await this.auditLogRepo.insert({
      admin_id: adminId,
      action: 'FORCE_CANCEL_RIDE',
      entity_type: 'bookings',
      entity_id: bookingId,
      metadata: { reason: reason ?? 'Force cancelled by admin' },
      ip_address: ipAddress,
    });

    return { message: 'Ride force cancelled successfully' };
  }
}
