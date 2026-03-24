import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../../database/entities/booking.entity';
import { Payment, PaymentStatus } from '../../../database/entities/payment.entity';
import { DriverStatusEntity } from '../../../database/entities/driver-status.entity';
import { BookingDriverAssignment } from '../../../database/entities/booking-driver-assignment.entity';

/** Phase 7.1 — GET /admin/dashboard response (plan.md). */
export interface AdminDashboardMetricsDto {
  total_rides_today: number;
  active_drivers: number;
  completed_rides: number;
  total_revenue: number;
  driver_utilization_rate: number;
  average_response_time_seconds: number;
}

function todayYmd(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local calendar day bounds [start, nextDay) for portable SQL across MySQL/Postgres. */
function localDayBounds(dayYmd: string): { start: Date; endExclusive: Date } {
  const start = new Date(`${dayYmd}T00:00:00`);
  const endExclusive = new Date(start);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { start, endExclusive };
}

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(DriverStatusEntity)
    private readonly driverStatusRepo: Repository<DriverStatusEntity>,
    @InjectRepository(BookingDriverAssignment)
    private readonly assignmentRepo: Repository<BookingDriverAssignment>,
    private readonly dataSource: DataSource,
  ) {}

  async getDashboardMetrics(): Promise<AdminDashboardMetricsDto> {
    const day = todayYmd();
    const { start, endExclusive } = localDayBounds(day);

    const [
      total_rides_today,
      completed_rides,
      revenueRow,
      active_drivers,
      onlineWithBooking,
      avgResponseRow,
    ] = await Promise.all([
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.created_at >= :start AND b.created_at < :end', {
          start,
          end: endExclusive,
        })
        .getCount(),
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.status = :st', { st: BookingStatus.TRIP_COMPLETED })
        .andWhere('b.updated_at >= :start AND b.updated_at < :end', {
          start,
          end: endExclusive,
        })
        .getCount(),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'sum')
        .where('p.status = :st', { st: PaymentStatus.SUCCESS })
        .andWhere('p.created_at >= :start AND p.created_at < :end', {
          start,
          end: endExclusive,
        })
        .getRawOne<{ sum: string }>(),
      this.driverStatusRepo.count({ where: { is_online: true } }),
      this.driverStatusRepo.count({
        where: {
          is_online: true,
          current_booking_id: Not(IsNull()),
        },
      }),
      this.avgAcceptanceSecondsRaw(start, endExclusive),
    ]);

    const total_revenue = toNum(revenueRow?.sum);
    const average_response_time_seconds = Math.round(
      toNum(avgResponseRow?.avg_sec),
    );

    const driver_utilization_rate =
      active_drivers > 0
        ? Math.round((onlineWithBooking / active_drivers) * 10000) / 100
        : 0;

    return {
      total_rides_today,
      active_drivers,
      completed_rides,
      total_revenue,
      driver_utilization_rate,
      average_response_time_seconds,
    };
  }

  private async avgAcceptanceSecondsRaw(
    start: Date,
    endExclusive: Date,
  ): Promise<{ avg_sec: string } | undefined> {
    const isMysql =
      this.dataSource.options.type === 'mysql' ||
      this.dataSource.options.type === 'mariadb';

    const avgExpr = isMysql
      ? 'AVG(TIMESTAMPDIFF(SECOND, a.assigned_at, a.accepted_at))'
      : 'AVG(EXTRACT(EPOCH FROM (a.accepted_at - a.assigned_at)))';

    return this.assignmentRepo
      .createQueryBuilder('a')
      .select(avgExpr, 'avg_sec')
      .where('a.accepted_at IS NOT NULL')
      .andWhere('a.assigned_at >= :start AND a.assigned_at < :end', {
        start,
        end: endExclusive,
      })
      .getRawOne<{ avg_sec: string }>();
  }
}
