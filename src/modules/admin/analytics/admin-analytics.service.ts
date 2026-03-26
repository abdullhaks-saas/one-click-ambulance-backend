import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';
import {
  Payment,
  PaymentStatus,
} from '../../../database/entities/payment.entity';
import { BookingDriverAssignment } from '../../../database/entities/booking-driver-assignment.entity';
import {
  WalletTransaction,
  WalletTransactionType,
} from '../../../database/entities/wallet-transaction.entity';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DailyRidesQueryDto } from './dto/daily-rides-query.dto';
import { TopDriversQueryDto } from './dto/top-drivers-query.dto';

const MAX_RANGE_DAYS = 366;

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    throw new BadRequestException(`Invalid date: ${ymd}`);
  }
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function localDayBounds(dayYmd: string): { start: Date; endExclusive: Date } {
  const start = parseYmd(dayYmd);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
}

function daysInclusive(fromYmd: string, toYmd: string): number {
  const a = parseYmd(fromYmd).getTime();
  const b = parseYmd(toYmd).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

function eachYmdInclusive(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  const cur = parseYmd(fromYmd);
  const end = parseYmd(toYmd);
  for (; cur.getTime() <= end.getTime(); cur.setDate(cur.getDate() + 1)) {
    out.push(formatYmd(new Date(cur)));
  }
  return out;
}

function weekStartYmd(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return formatYmd(x);
}

@Injectable()
export class AdminAnalyticsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(BookingDriverAssignment)
    private readonly assignmentRepo: Repository<BookingDriverAssignment>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  private isMysql(): boolean {
    const t = this.dataSource.options.type;
    return t === 'mysql' || t === 'mariadb';
  }

  private resolveRange(dto: AnalyticsQueryDto): {
    start: Date;
    endExclusive: Date;
    from: string;
    to: string;
  } {
    const today = formatYmd(new Date());
    const toStr = dto.to ?? today;
    const fromStr = dto.from ?? formatYmd(addDays(parseYmd(toStr), -29));

    if (parseYmd(fromStr) > parseYmd(toStr)) {
      throw new BadRequestException('from must be on or before to');
    }
    if (daysInclusive(fromStr, toStr) > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range must be at most ${MAX_RANGE_DAYS} days`,
      );
    }

    const { start } = localDayBounds(fromStr);
    const { endExclusive } = localDayBounds(toStr);
    return { start, endExclusive, from: fromStr, to: toStr };
  }

  private applyBookingFilters(
    qb: SelectQueryBuilder<ObjectLiteral>,
    dto: Pick<AnalyticsQueryDto, 'zone_id' | 'ambulance_type_id'>,
    alias = 'b',
  ) {
    if (dto.zone_id) {
      qb.andWhere(`${alias}.zone_id = :zone_id`, { zone_id: dto.zone_id });
    }
    if (dto.ambulance_type_id) {
      qb.andWhere(`${alias}.ambulance_type_id = :ambulance_type_id`, {
        ambulance_type_id: dto.ambulance_type_id,
      });
    }
  }

  private async rideCountsPerDay(
    fromStr: string,
    toStr: string,
    dto: Pick<AnalyticsQueryDto, 'zone_id' | 'ambulance_type_id'>,
  ): Promise<{ date: string; ride_count: number }[]> {
    const days = eachYmdInclusive(fromStr, toStr);
    const data: { date: string; ride_count: number }[] = [];
    for (const dayStr of days) {
      const { start, endExclusive } = localDayBounds(dayStr);
      const qb = this.bookingRepo
        .createQueryBuilder('b')
        .where('b.created_at >= :ds AND b.created_at < :de', {
          ds: start,
          de: endExclusive,
        });
      this.applyBookingFilters(qb, dto);
      data.push({ date: dayStr, ride_count: await qb.getCount() });
    }
    return data;
  }

  async dailyRides(dto: DailyRidesQueryDto) {
    let fromStr: string;
    let toStr: string;
    if (dto.date) {
      fromStr = toStr = dto.date;
      if (daysInclusive(fromStr, toStr) > MAX_RANGE_DAYS) {
        throw new BadRequestException('Invalid date');
      }
    } else {
      const r = this.resolveRange(dto);
      fromStr = r.from;
      toStr = r.to;
    }

    const days = await this.rideCountsPerDay(fromStr, toStr, dto);
    return { from: fromStr, to: toStr, days };
  }

  async weeklyRides(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const daily = await this.rideCountsPerDay(r.from, r.to, dto);
    const weekMap = new Map<string, number>();
    for (const { date, ride_count } of daily) {
      const wk = weekStartYmd(parseYmd(date));
      weekMap.set(wk, (weekMap.get(wk) ?? 0) + ride_count);
    }
    const weeks = [...weekMap.entries()]
      .map(([week_start, ride_count]) => ({ week_start, ride_count }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));
    return { from: r.from, to: r.to, weeks };
  }

  async monthlyRides(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const daily = await this.rideCountsPerDay(r.from, r.to, dto);
    const monthMap = new Map<string, number>();
    for (const { date, ride_count } of daily) {
      const ym = date.slice(0, 7);
      monthMap.set(ym, (monthMap.get(ym) ?? 0) + ride_count);
    }
    const months = [...monthMap.entries()]
      .map(([year_month, ride_count]) => ({ year_month, ride_count }))
      .sort((a, b) => a.year_month.localeCompare(b.year_month));
    return { from: r.from, to: r.to, months };
  }

  async revenueSummary(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const days = eachYmdInclusive(r.from, r.to);
    const series: { date: string; revenue: number }[] = [];
    let total = 0;
    for (const dayStr of days) {
      const rev = await this.paymentSumForDay(dayStr, dto);
      total += rev;
      series.push({ date: dayStr, revenue: rev });
    }
    return {
      from: r.from,
      to: r.to,
      total_revenue: Math.round(total * 100) / 100,
      by_day: series,
    };
  }

  private async paymentSumForDay(
    dayStr: string,
    dto: Pick<AnalyticsQueryDto, 'zone_id' | 'ambulance_type_id'>,
  ): Promise<number> {
    const { start, endExclusive } = localDayBounds(dayStr);
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'sum')
      .where('p.status = :st', { st: PaymentStatus.SUCCESS })
      .andWhere('p.created_at >= :ds AND p.created_at < :de', {
        ds: start,
        de: endExclusive,
      });
    if (dto.zone_id || dto.ambulance_type_id) {
      qb.innerJoin('bookings', 'bk', 'bk.id = p.booking_id');
      if (dto.zone_id) {
        qb.andWhere('bk.zone_id = :zone_id', { zone_id: dto.zone_id });
      }
      if (dto.ambulance_type_id) {
        qb.andWhere('bk.ambulance_type_id = :ambulance_type_id', {
          ambulance_type_id: dto.ambulance_type_id,
        });
      }
    }
    const row = await qb.getRawOne<{ sum: string }>();
    return Math.round(toNum(row?.sum) * 100) / 100;
  }

  async driverUtilization(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.ride_details', 'rd')
      .innerJoin(
        'b.driver_assignments',
        'bda',
        'bda.is_current = :cur AND bda.accepted_at IS NOT NULL',
        { cur: true },
      )
      .leftJoin('bda.driver', 'd')
      .where('b.status = :st', { st: BookingStatus.TRIP_COMPLETED })
      .andWhere('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .select('bda.driver_id', 'driver_id')
      .addSelect('MAX(d.name)', 'driver_name')
      .addSelect('COUNT(DISTINCT b.id)', 'completed_rides')
      .addSelect(
        'COALESCE(SUM(rd.total_duration_min), 0)',
        'total_ride_duration_min',
      )
      .addSelect(
        'COALESCE(SUM(rd.total_distance_km), 0)',
        'total_ride_distance_km',
      )
      .groupBy('bda.driver_id');

    this.applyBookingFilters(qb, dto);

    const rows = await qb.getRawMany<{
      driver_id: string;
      driver_name: string | null;
      completed_rides: string;
      total_ride_duration_min: string;
      total_ride_distance_km: string;
    }>();

    return {
      from: r.from,
      to: r.to,
      note: 'Trip duration/distance from ride_details for completed rides. Online time is not stored in driver_status history.',
      drivers: rows.map((x) => ({
        driver_id: x.driver_id,
        driver_name: x.driver_name,
        completed_rides: parseInt(x.completed_rides, 10),
        total_ride_duration_min: toNum(x.total_ride_duration_min),
        total_ride_distance_km: toNum(x.total_ride_distance_km),
      })),
    };
  }

  async averageResponseTime(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const avgExpr = this.isMysql()
      ? 'AVG(TIMESTAMPDIFF(SECOND, a.assigned_at, a.accepted_at))'
      : 'AVG(EXTRACT(EPOCH FROM (a.accepted_at - a.assigned_at)))';

    const base = this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoin('a.booking', 'b')
      .where('a.accepted_at IS NOT NULL')
      .andWhere('a.assigned_at >= :start AND a.assigned_at < :end', {
        start: r.start,
        end: r.endExclusive,
      });
    this.applyBookingFilters(base, dto, 'b');

    const overall = await base
      .clone()
      .select(avgExpr, 'avg_sec')
      .getRawOne<{ avg_sec: string }>();

    const days = eachYmdInclusive(r.from, r.to);
    const by_day: { date: string; average_response_time_seconds: number }[] =
      [];
    for (const dayStr of days) {
      const { start, endExclusive } = localDayBounds(dayStr);
      const row = await base
        .clone()
        .andWhere('a.assigned_at >= :ds AND a.assigned_at < :de', {
          ds: start,
          de: endExclusive,
        })
        .select(avgExpr, 'avg_sec')
        .getRawOne<{ avg_sec: string }>();
      by_day.push({
        date: dayStr,
        average_response_time_seconds: Math.round(toNum(row?.avg_sec)),
      });
    }

    return {
      from: r.from,
      to: r.to,
      overall_average_response_time_seconds: Math.round(
        toNum(overall?.avg_sec),
      ),
      by_day,
    };
  }

  async topDrivers(dto: TopDriversQueryDto) {
    const r = this.resolveRange(dto);
    const limit = dto.limit ?? 10;

    const rideQb = this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin(
        'b.driver_assignments',
        'bda',
        'bda.is_current = :cur AND bda.accepted_at IS NOT NULL',
        { cur: true },
      )
      .leftJoin('bda.driver', 'd')
      .where('b.status = :st', { st: BookingStatus.TRIP_COMPLETED })
      .andWhere('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .select('bda.driver_id', 'driver_id')
      .addSelect('MAX(d.name)', 'driver_name')
      .addSelect('MAX(d.mobile_number)', 'mobile_number')
      .addSelect('COUNT(DISTINCT b.id)', 'completed_rides')
      .groupBy('bda.driver_id');
    this.applyBookingFilters(rideQb, dto);

    const rideRows = await rideQb.getRawMany<{
      driver_id: string;
      driver_name: string | null;
      mobile_number: string | null;
      completed_rides: string;
    }>();

    const earnQb = this.walletTxRepo
      .createQueryBuilder('w')
      .select('w.driver_id', 'driver_id')
      .addSelect('COALESCE(SUM(w.amount), 0)', 'earnings')
      .where('w.transaction_type = :t', {
        t: WalletTransactionType.DRIVER_COMMISSION_CREDIT,
      })
      .andWhere('w.created_at >= :start AND w.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .groupBy('w.driver_id');

    if (dto.zone_id || dto.ambulance_type_id) {
      earnQb.innerJoin('bookings', 'bk', 'bk.id = w.booking_id');
      if (dto.zone_id) {
        earnQb.andWhere('bk.zone_id = :zone_id', { zone_id: dto.zone_id });
      }
      if (dto.ambulance_type_id) {
        earnQb.andWhere('bk.ambulance_type_id = :ambulance_type_id', {
          ambulance_type_id: dto.ambulance_type_id,
        });
      }
    }

    const earnRows = await earnQb.getRawMany<{
      driver_id: string;
      earnings: string;
    }>();
    const earnMap = new Map(
      earnRows.map((e) => [e.driver_id, toNum(e.earnings)]),
    );

    const merged = rideRows.map((row) => ({
      driver_id: row.driver_id,
      driver_name: row.driver_name,
      mobile_number: row.mobile_number,
      completed_rides: parseInt(row.completed_rides, 10),
      commission_credited:
        Math.round((earnMap.get(row.driver_id) ?? 0) * 100) / 100,
    }));

    for (const e of earnRows) {
      if (merged.some((m) => m.driver_id === e.driver_id)) continue;
      merged.push({
        driver_id: e.driver_id,
        driver_name: null,
        mobile_number: null,
        completed_rides: 0,
        commission_credited: Math.round(toNum(e.earnings) * 100) / 100,
      });
    }

    merged.sort((a, b) => {
      if (b.completed_rides !== a.completed_rides) {
        return b.completed_rides - a.completed_rides;
      }
      return b.commission_credited - a.commission_credited;
    });

    return {
      from: r.from,
      to: r.to,
      limit,
      drivers: merged.slice(0, limit),
    };
  }

  async rideCancellations(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);

    const totalQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      });
    this.applyBookingFilters(totalQb, dto);
    const total_bookings = await totalQb.getCount();

    const cancelStatuses = [
      BookingStatus.CANCELLED,
      BookingStatus.FORCE_CANCELLED,
    ];
    const cancelledQb = this.bookingRepo
      .createQueryBuilder('b')
      .where('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .andWhere('b.status IN (:...st)', { st: cancelStatuses });
    this.applyBookingFilters(cancelledQb, dto);
    const cancelled_bookings = await cancelledQb.getCount();

    const reasonExpr =
      "COALESCE(NULLIF(TRIM(b.cancellation_reason), ''), '(no reason)')";
    const reasonQb = this.bookingRepo
      .createQueryBuilder('b')
      .select(reasonExpr, 'reason')
      .addSelect('COUNT(b.id)', 'cnt')
      .where('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .andWhere('b.status IN (:...st)', { st: cancelStatuses })
      .groupBy(reasonExpr);
    this.applyBookingFilters(reasonQb, dto);

    const reasonRows = await reasonQb.getRawMany<{
      reason: string;
      cnt: string;
    }>();

    return {
      from: r.from,
      to: r.to,
      total_bookings,
      cancelled_bookings,
      cancellation_rate:
        total_bookings > 0
          ? Math.round((cancelled_bookings / total_bookings) * 10000) / 100
          : 0,
      by_reason: reasonRows.map((x) => ({
        reason: x.reason,
        count: parseInt(x.cnt, 10),
      })),
    };
  }

  async zoneDemand(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoin('b.zone', 'z')
      .where('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .select('b.zone_id', 'zone_id')
      .addSelect('z.zone_name', 'zone_name')
      .addSelect('COUNT(b.id)', 'ride_count')
      .groupBy('b.zone_id')
      .addGroupBy('z.zone_name');
    if (dto.zone_id) {
      qb.andWhere('b.zone_id = :zone_id', { zone_id: dto.zone_id });
    }
    if (dto.ambulance_type_id) {
      qb.andWhere('b.ambulance_type_id = :ambulance_type_id', {
        ambulance_type_id: dto.ambulance_type_id,
      });
    }

    const rows = await qb.getRawMany<{
      zone_id: string | null;
      zone_name: string | null;
      ride_count: string;
    }>();

    return {
      from: r.from,
      to: r.to,
      zones: rows.map((x) => ({
        zone_id: x.zone_id,
        zone_name: x.zone_name,
        ride_count: parseInt(x.ride_count, 10),
      })),
    };
  }

  async ambulanceTypeDemand(dto: AnalyticsQueryDto) {
    const r = this.resolveRange(dto);
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin('b.ambulance_type', 'at')
      .where('b.created_at >= :start AND b.created_at < :end', {
        start: r.start,
        end: r.endExclusive,
      })
      .select('b.ambulance_type_id', 'ambulance_type_id')
      .addSelect('at.name', 'ambulance_type_name')
      .addSelect('COUNT(b.id)', 'ride_count')
      .groupBy('b.ambulance_type_id')
      .addGroupBy('at.name');
    if (dto.zone_id) {
      qb.andWhere('b.zone_id = :zone_id', { zone_id: dto.zone_id });
    }
    if (dto.ambulance_type_id) {
      qb.andWhere('b.ambulance_type_id = :ambulance_type_id', {
        ambulance_type_id: dto.ambulance_type_id,
      });
    }

    const rows = await qb.getRawMany<{
      ambulance_type_id: string;
      ambulance_type_name: string;
      ride_count: string;
    }>();

    return {
      from: r.from,
      to: r.to,
      ambulance_types: rows.map((x) => ({
        ambulance_type_id: x.ambulance_type_id,
        ambulance_type_name: x.ambulance_type_name,
        ride_count: parseInt(x.ride_count, 10),
      })),
    };
  }
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
