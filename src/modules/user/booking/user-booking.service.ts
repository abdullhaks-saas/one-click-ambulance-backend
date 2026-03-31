import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { PricingRule } from '../../../database/entities/pricing-rule.entity';
import { AmbulanceType } from '../../../database/entities/ambulance-type.entity';
import { Booking, BookingStatus } from '../../../database/entities/booking.entity';
import { BookingStatusHistory } from '../../../database/entities/booking-status-history.entity';
import { User } from '../../../database/entities/user.entity';
import { Zone } from '../../../database/entities/zone.entity';
import { HttpService } from '../../../shared/http/http.service';
import {
  assertValidCoordinates,
  haversineDistanceKm,
} from '../../../common/utils/geo';
import { EstimateFareQueryDto } from './dto/estimate-fare.query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingHistoryQueryDto } from './dto/booking-history.query.dto';
import { DispatchService } from '../../dispatch/dispatch.service';

/** Night window in Asia/Kolkata: 22:00–05:59 inclusive uses night_charge. */
const NIGHT_START_HOUR_IST = 22;
const NIGHT_END_HOUR_IST = 6;

const HAVERSINE_ROAD_FACTOR = 1.25;
const FALLBACK_AVG_SPEED_KMH = 35;

type DistanceSource = 'google_maps' | 'haversine' | 'client';

interface GoogleDistanceElement {
  status: string;
  distance?: { value: number; text: string };
  duration?: { value: number; text: string };
}

interface GoogleDistanceMatrixResponse {
  status: string;
  rows?: { elements: GoogleDistanceElement[] }[];
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundDistanceKm(n: number): number {
  return Math.round(n * 100) / 100;
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  return parseInt(hourPart?.value ?? '0', 10);
}

function isNightRateIst(at: Date): boolean {
  const h = getHourInTimeZone(at, 'Asia/Kolkata');
  return h >= NIGHT_START_HOUR_IST || h < NIGHT_END_HOUR_IST;
}

const USER_CANCELLABLE_STATUSES: BookingStatus[] = [
  BookingStatus.CREATED,
  BookingStatus.SEARCHING,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.NO_DRIVER_FOUND,
];

@Injectable()
export class UserBookingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(PricingRule)
    private readonly pricingRuleRepo: Repository<PricingRule>,
    @InjectRepository(AmbulanceType)
    private readonly ambulanceTypeRepo: Repository<AmbulanceType>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepo: Repository<BookingStatusHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly dispatchService: DispatchService,
  ) {}

  async estimateFare(query: EstimateFareQueryDto) {
    const ambulanceType = await this.ambulanceTypeRepo.findOne({
      where: { id: query.ambulance_type_id },
    });
    if (!ambulanceType) {
      throw new NotFoundException('Ambulance type not found');
    }
    return this.buildFareEstimate(query);
  }

  async createBooking(userId: string, dto: CreateBookingDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.is_blocked) {
      throw new ForbiddenException('Account is blocked');
    }

    const ambulanceType = await this.ambulanceTypeRepo.findOne({
      where: { id: dto.ambulance_type_id },
    });
    if (!ambulanceType) {
      throw new NotFoundException('Ambulance type not found');
    }

    if (dto.zone_id) {
      const zone = await this.zoneRepo.findOne({ where: { id: dto.zone_id } });
      if (!zone) {
        throw new NotFoundException('Zone not found');
      }
    }

    assertValidCoordinates(dto.pickup_latitude, dto.pickup_longitude);
    assertValidCoordinates(dto.drop_latitude, dto.drop_longitude);

    const fareQuery: EstimateFareQueryDto = {
      ambulance_type_id: dto.ambulance_type_id,
      pickup_latitude: dto.pickup_latitude,
      pickup_longitude: dto.pickup_longitude,
      drop_latitude: dto.drop_latitude,
      drop_longitude: dto.drop_longitude,
      include_emergency: dto.is_emergency === true,
    };

    const fare = await this.buildFareEstimate(fareQuery);

    const booking = await this.dataSource.transaction(async (manager) => {
      const bRepo = manager.getRepository(Booking);
      const hRepo = manager.getRepository(BookingStatusHistory);

      const b = bRepo.create({
        user_id: userId,
        ambulance_type_id: dto.ambulance_type_id,
        zone_id: dto.zone_id ?? undefined,
        pickup_latitude: dto.pickup_latitude,
        pickup_longitude: dto.pickup_longitude,
        pickup_address: dto.pickup_address ?? undefined,
        drop_latitude: dto.drop_latitude,
        drop_longitude: dto.drop_longitude,
        drop_address: dto.drop_address ?? undefined,
        status: BookingStatus.SEARCHING,
        estimated_fare: fare.estimated_fare,
        estimated_distance_km: fare.estimated_distance_km,
        estimated_duration_min: fare.estimated_duration_minutes,
        is_emergency: dto.is_emergency === true,
      });

      const saved = await bRepo.save(b);
      await hRepo.save(
        hRepo.create({
          booking_id: saved.id,
          status: BookingStatus.SEARCHING,
          metadata: {
            estimated_fare: fare.estimated_fare,
          },
        }),
      );
      return saved;
    });

    const offer = await this.dispatchService.startCustomerDispatch(booking.id);

    const fresh = await this.bookingRepo.findOne({
      where: { id: booking.id },
      relations: ['ambulance_type'],
    });

    return {
      booking: this.mapBookingSummary(fresh!),
      fare_estimate: fare,
      dispatch: {
        driver_offered: offer.offered,
        driver_id: offer.driver_id ?? null,
        assignment_id: offer.assignment_id ?? null,
      },
    };
  }

  async getStatus(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const history = await this.statusHistoryRepo.find({
      where: { booking_id: bookingId },
      order: { created_at: 'DESC' },
      take: 30,
    });
    return {
      booking_id: bookingId,
      status: booking!.status,
      updated_at: booking!.updated_at,
      timeline: history
        .slice()
        .reverse()
        .map((h) => ({
          status: h.status,
          created_at: h.created_at,
          metadata: h.metadata,
        })),
    };
  }

  async getDetails(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
      relations: {
        ambulance_type: true,
        zone: true,
        status_history: true,
        driver_assignments: { driver: true },
        ride_details: true,
        ride_status: true,
      },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const history = [...(booking.status_history ?? [])].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );

    const assignments = [...(booking.driver_assignments ?? [])].sort(
      (a, b) => b.assigned_at.getTime() - a.assigned_at.getTime(),
    );

    return {
      id: booking.id,
      status: booking.status,
      pickup_latitude: Number(booking.pickup_latitude),
      pickup_longitude: Number(booking.pickup_longitude),
      pickup_address: booking.pickup_address,
      drop_latitude: Number(booking.drop_latitude),
      drop_longitude: Number(booking.drop_longitude),
      drop_address: booking.drop_address,
      ambulance_type: booking.ambulance_type
        ? { id: booking.ambulance_type.id, name: booking.ambulance_type.name }
        : null,
      zone: booking.zone
        ? { id: booking.zone.id, zone_name: booking.zone.zone_name }
        : null,
      estimated_fare:
        booking.estimated_fare != null ? Number(booking.estimated_fare) : null,
      final_fare:
        booking.final_fare != null ? Number(booking.final_fare) : null,
      estimated_distance_km:
        booking.estimated_distance_km != null
          ? Number(booking.estimated_distance_km)
          : null,
      estimated_duration_min: booking.estimated_duration_min,
      is_emergency: booking.is_emergency,
      cancellation_reason: booking.cancellation_reason,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      status_timeline: history.map((h) => ({
        id: h.id,
        status: h.status,
        created_at: h.created_at,
        metadata: h.metadata,
      })),
      driver_assignments: assignments.map((a) => ({
        id: a.id,
        driver_id: a.driver_id,
        assigned_at: a.assigned_at,
        accepted_at: a.accepted_at,
        rejected_at: a.rejected_at,
        is_current: a.is_current,
        driver: a.driver
          ? {
              id: a.driver.id,
              name: a.driver.name,
              mobile_number: a.driver.mobile_number,
            }
          : null,
      })),
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
      ride_status: booking.ride_status
        ? {
            id: booking.ride_status.id,
            status: booking.ride_status.status,
            updated_at: booking.ride_status.updated_at,
          }
        : null,
    };
  }

  async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string,
  ) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!USER_CANCELLABLE_STATUSES.includes(booking.status as BookingStatus)) {
      throw new BadRequestException(
        `Booking cannot be cancelled in status: ${booking.status}`,
      );
    }

    await this.dispatchService.userCancelBookingRelease(bookingId);

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.CANCELLED,
      cancellation_reason: reason ?? 'cancelled_by_user',
    });

    await this.appendHistory(bookingId, BookingStatus.CANCELLED, {
      reason: reason ?? 'cancelled_by_user',
    });

    return { booking_id: bookingId, status: BookingStatus.CANCELLED };
  }

  async listHistory(userId: string, query: BookingHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.ambulance_type', 'at')
      .where('b.user_id = :uid', { uid: userId })
      .orderBy('b.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('b.status = :st', { st: query.status });
    }
    if (query.from) {
      qb.andWhere('b.created_at >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('b.created_at <= :to', { to: new Date(query.to) });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((b) => this.mapBookingSummary(b)),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private mapBookingSummary(booking: Booking) {
    return {
      id: booking.id,
      status: booking.status,
      ambulance_type: booking.ambulance_type
        ? { id: booking.ambulance_type.id, name: booking.ambulance_type.name }
        : null,
      pickup_latitude: Number(booking.pickup_latitude),
      pickup_longitude: Number(booking.pickup_longitude),
      drop_latitude: Number(booking.drop_latitude),
      drop_longitude: Number(booking.drop_longitude),
      estimated_fare:
        booking.estimated_fare != null ? Number(booking.estimated_fare) : null,
      final_fare:
        booking.final_fare != null ? Number(booking.final_fare) : null,
      is_emergency: booking.is_emergency,
      created_at: booking.created_at,
    };
  }

  private async appendHistory(
    bookingId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        booking_id: bookingId,
        status,
        metadata,
      }),
    );
  }

  private async buildFareEstimate(query: EstimateFareQueryDto) {
    const hasFullCoords =
      query.pickup_latitude != null &&
      query.pickup_longitude != null &&
      query.drop_latitude != null &&
      query.drop_longitude != null;

    const hasClientDistance =
      query.distance_km != null && query.distance_km >= 0;

    if (!hasFullCoords && !hasClientDistance) {
      throw new BadRequestException(
        'Provide pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, or distance_km',
      );
    }

    if (hasFullCoords) {
      assertValidCoordinates(query.pickup_latitude!, query.pickup_longitude!);
      assertValidCoordinates(query.drop_latitude!, query.drop_longitude!);
    }

    const atDate = query.at ? new Date(query.at) : new Date();
    if (Number.isNaN(atDate.getTime())) {
      throw new BadRequestException('Invalid at datetime');
    }

    const rule = await this.pricingRuleRepo.findOne({
      where: { ambulance_type_id: query.ambulance_type_id },
      relations: ['ambulance_type'],
    });

    if (!rule) {
      throw new NotFoundException('Pricing not configured for this ambulance type');
    }

    const baseFare = Number(rule.base_fare ?? 0);
    const perKm = Number(rule.per_km_price ?? 0);
    const emergencyCharge = Number(rule.emergency_charge ?? 0);
    const nightCharge = Number(rule.night_charge ?? 0);
    const minimumFare = Number(rule.minimum_fare ?? 0);
    const tollEstimate = Number(rule.toll_charge ?? 0);

    const { distanceKm, durationMinutes, source } =
      await this.resolveDistanceAndDuration(query, hasFullCoords);

    const distanceCharge = roundMoney(distanceKm * perKm);
    const nightApplicable = isNightRateIst(atDate);
    const nightApplied = nightApplicable ? nightCharge : 0;
    const emergencyApplied =
      query.include_emergency === true ? emergencyCharge : 0;

    const subtotalBeforeMin = roundMoney(
      baseFare +
        distanceCharge +
        nightApplied +
        emergencyApplied +
        tollEstimate,
    );

    const appliedMinimum = subtotalBeforeMin < minimumFare;
    const estimatedFare = roundMoney(
      appliedMinimum ? minimumFare : subtotalBeforeMin,
    );

    const ambulanceType =
      rule.ambulance_type ??
      (await this.ambulanceTypeRepo.findOne({
        where: { id: query.ambulance_type_id },
      }));

    return {
      ambulance_type_id: query.ambulance_type_id,
      ambulance_type_name: ambulanceType?.name ?? '',
      estimated_distance_km: roundDistanceKm(distanceKm),
      estimated_duration_minutes: durationMinutes,
      distance_source: source,
      at: atDate.toISOString(),
      is_night_rate: nightApplicable,
      breakdown: {
        base_fare: roundMoney(baseFare),
        distance_km: roundDistanceKm(distanceKm),
        per_km_price: roundMoney(perKm),
        distance_charge: distanceCharge,
        night_charge: roundMoney(nightApplied),
        emergency_charge: roundMoney(emergencyApplied),
        toll_estimate: roundMoney(tollEstimate),
        subtotal_before_minimum: subtotalBeforeMin,
        minimum_fare: roundMoney(minimumFare),
        applied_minimum: appliedMinimum,
      },
      estimated_fare: estimatedFare,
    };
  }

  private async resolveDistanceAndDuration(
    query: EstimateFareQueryDto,
    hasFullCoords: boolean,
  ): Promise<{
    distanceKm: number;
    durationMinutes: number;
    source: DistanceSource;
  }> {
    if (
      query.distance_km != null &&
      query.distance_km >= 0 &&
      !hasFullCoords
    ) {
      const distanceKm = query.distance_km;
      const durationMinutes =
        query.duration_minutes != null && query.duration_minutes >= 0
          ? Math.ceil(query.duration_minutes)
          : Math.max(
              1,
              Math.ceil((distanceKm / FALLBACK_AVG_SPEED_KMH) * 60),
            );
      return {
        distanceKm,
        durationMinutes,
        source: 'client',
      };
    }

    const pickupLat = query.pickup_latitude!;
    const pickupLng = query.pickup_longitude!;
    const dropLat = query.drop_latitude!;
    const dropLng = query.drop_longitude!;

    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (apiKey) {
      const google = await this.fetchGoogleDistance(
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
      );
      if (google) {
        return google;
      }
    }

    const straightKm = haversineDistanceKm(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    );
    const distanceKm = straightKm * HAVERSINE_ROAD_FACTOR;
    const durationMinutes = Math.max(
      1,
      Math.ceil((distanceKm / FALLBACK_AVG_SPEED_KMH) * 60),
    );
    return {
      distanceKm,
      durationMinutes,
      source: 'haversine',
    };
  }

  private async fetchGoogleDistance(
    pickupLat: number,
    pickupLng: number,
    dropLat: number,
    dropLng: number,
  ): Promise<{
    distanceKm: number;
    durationMinutes: number;
    source: DistanceSource;
  } | null> {
    const origins = `${pickupLat},${pickupLng}`;
    const destinations = `${dropLat},${dropLng}`;
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';

    try {
      const res = await this.httpService.get<GoogleDistanceMatrixResponse>(
        url,
        {
          params: {
            origins,
            destinations,
            units: 'metric',
          },
        },
      );

      const data = res.data;
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return null;
      }

      const el = data.rows?.[0]?.elements?.[0];
      if (!el || el.status !== 'OK' || !el.distance?.value) {
        return null;
      }

      const distanceKm = el.distance.value / 1000;
      const durationMinutes = el.duration?.value
        ? Math.ceil(el.duration.value / 60)
        : Math.max(
            1,
            Math.ceil((distanceKm / FALLBACK_AVG_SPEED_KMH) * 60),
          );

      return {
        distanceKm,
        durationMinutes,
        source: 'google_maps',
      };
    } catch {
      return null;
    }
  }
}
