import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'json2csv';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';
import {
  Payment,
  PaymentStatus,
} from '../../../database/entities/payment.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { BookingDriverAssignment } from '../../../database/entities/booking-driver-assignment.entity';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportExportQueryDto } from './dto/report-export-query.dto';

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(BookingDriverAssignment)
    private readonly assignmentRepo: Repository<BookingDriverAssignment>,
  ) {}

  async ridesReport(query: ReportQueryDto) {
    const { page = 1, limit = 20, from, to, status, zone_id, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.ambulance_type', 'at')
      .leftJoinAndSelect('b.zone', 'z')
      .leftJoinAndSelect('b.ride_details', 'rd')
      .orderBy('b.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) qb.andWhere('b.status = :status', { status });
    if (zone_id) qb.andWhere('b.zone_id = :zone_id', { zone_id });
    if (from) qb.andWhere('DATE(b.created_at) >= :from', { from });
    if (to) qb.andWhere('DATE(b.created_at) <= :to', { to });
    if (search) {
      qb.andWhere('(u.mobile_number LIKE :s OR u.name LIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((b) => ({
        id: b.id,
        status: b.status,
        user_mobile: b.user?.mobile_number,
        ambulance_type: b.ambulance_type?.name,
        zone: b.zone?.zone_name,
        estimated_fare: b.estimated_fare,
        final_fare: b.final_fare,
        total_distance_km: b.ride_details?.total_distance_km ?? null,
        total_duration_min: b.ride_details?.total_duration_min ?? null,
        created_at: b.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async revenueReport(query: ReportQueryDto) {
    const { page = 1, limit = 30, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('DATE(p.created_at)', 'day')
      .addSelect('SUM(p.amount)', 'total_amount')
      .addSelect('COUNT(p.id)', 'payment_count')
      .where('p.status = :st', { st: PaymentStatus.SUCCESS })
      .groupBy('DATE(p.created_at)')
      .orderBy('day', 'DESC');

    if (from) qb.andWhere('DATE(p.created_at) >= :from', { from });
    if (to) qb.andWhere('DATE(p.created_at) <= :to', { to });

    const raw = await qb.getRawMany<{
      day: string;
      total_amount: string;
      payment_count: string;
    }>();

    const slice = raw.slice(skip, skip + limit);
    return {
      data: slice.map((r) => ({
        day: r.day,
        total_amount: parseFloat(r.total_amount) || 0,
        payment_count: parseInt(r.payment_count, 10),
      })),
      meta: {
        total: raw.length,
        page,
        limit,
        total_pages: Math.ceil(raw.length / limit),
      },
    };
  }

  async driversReport(query: ReportQueryDto) {
    const { page = 1, limit = 20, search, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.driverRepo
      .createQueryBuilder('d')
      .orderBy('d.total_rides', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere('(d.mobile_number LIKE :s OR d.name LIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [drivers, total] = await qb.getManyAndCount();

    const ids = drivers.map((d) => d.id);
    const statsMap: Record<string, number> = {};
    if (ids.length) {
      const q2 = this.assignmentRepo
        .createQueryBuilder('a')
        .select('a.driver_id', 'driver_id')
        .addSelect('COUNT(DISTINCT a.booking_id)', 'cnt')
        .innerJoin('a.booking', 'b')
        .where('a.driver_id IN (:...ids)', { ids })
        .andWhere('b.status = :bs', { bs: BookingStatus.TRIP_COMPLETED });
      if (from) q2.andWhere('DATE(b.created_at) >= :from', { from });
      if (to) q2.andWhere('DATE(b.created_at) <= :to', { to });
      q2.groupBy('a.driver_id');
      const raws = await q2.getRawMany<{ driver_id: string; cnt: string }>();
      for (const r of raws) {
        statsMap[r.driver_id] = parseInt(r.cnt, 10);
      }
    }

    return {
      data: drivers.map((d) => ({
        id: d.id,
        name: d.name,
        mobile_number: d.mobile_number,
        total_rides_profile: d.total_rides,
        rating: Number(d.rating),
        completed_assignments_in_range: statsMap[d.id] ?? 0,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async paymentsReport(query: ReportQueryDto) {
    const { page = 1, limit = 20, from, to, status, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('p.booking', 'b')
      .orderBy('p.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) qb.andWhere('p.status = :status', { status });
    if (from) qb.andWhere('DATE(p.created_at) >= :from', { from });
    if (to) qb.andWhere('DATE(p.created_at) <= :to', { to });
    if (search) {
      qb.andWhere(
        '(u.mobile_number LIKE :s OR p.razorpay_payment_id LIKE :s OR p.razorpay_order_id LIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((p) => ({
        id: p.id,
        booking_id: p.booking_id,
        amount: Number(p.amount),
        status: p.status,
        payment_method: p.payment_method,
        razorpay_payment_id: p.razorpay_payment_id,
        user_mobile: p.user?.mobile_number,
        created_at: p.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async cancellationsReport(query: ReportQueryDto) {
    const { page = 1, limit = 20, from, to, zone_id, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'u')
      .leftJoinAndSelect('b.zone', 'z')
      .where('b.status = :st', { st: BookingStatus.CANCELLED })
      .orderBy('b.updated_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (zone_id) qb.andWhere('b.zone_id = :zone_id', { zone_id });
    if (from) qb.andWhere('DATE(b.updated_at) >= :from', { from });
    if (to) qb.andWhere('DATE(b.updated_at) <= :to', { to });
    if (search) {
      qb.andWhere('(u.mobile_number LIKE :s OR u.name LIKE :s)', {
        s: `%${search}%`,
      });
    }

    const [rows, total] = await qb.getManyAndCount();
    const byReason = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.cancellation_reason', 'reason')
      .addSelect('COUNT(b.id)', 'cnt')
      .where('b.status = :st', { st: BookingStatus.CANCELLED })
      .groupBy('b.cancellation_reason');

    if (from) byReason.andWhere('DATE(b.updated_at) >= :from', { from });
    if (to) byReason.andWhere('DATE(b.updated_at) <= :to', { to });

    const reasonRows = await byReason.getRawMany<{
      reason: string | null;
      cnt: string;
    }>();

    return {
      data: rows.map((b) => ({
        id: b.id,
        cancellation_reason: b.cancellation_reason,
        user_mobile: b.user?.mobile_number,
        zone: b.zone?.zone_name,
        updated_at: b.updated_at,
      })),
      summary_by_reason: reasonRows.map((r) => ({
        reason: r.reason || '(none)',
        count: parseInt(r.cnt, 10),
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  private async flatRowsForExport(
    q: ReportExportQueryDto,
  ): Promise<Record<string, unknown>[]> {
    const limit = 5000;
    const base = {
      page: 1,
      limit,
      from: q.from,
      to: q.to,
      status: q.status,
      zone_id: q.zone_id,
      search: q.search,
    } as ReportQueryDto;

    switch (q.report) {
      case 'rides': {
        const r = await this.ridesReport(base);
        return r.data as unknown as Record<string, unknown>[];
      }
      case 'revenue': {
        const r = await this.revenueReport({
          ...(base as ReportQueryDto),
          limit: 500,
        } as ReportQueryDto);
        return r.data as unknown as Record<string, unknown>[];
      }
      case 'drivers': {
        const r = await this.driversReport(base);
        return r.data as unknown as Record<string, unknown>[];
      }
      case 'payments': {
        const r = await this.paymentsReport(base);
        return r.data as unknown as Record<string, unknown>[];
      }
      case 'cancellations': {
        const r = await this.cancellationsReport(base);
        return (r.data ?? []) as Record<string, unknown>[];
      }
      default:
        throw new BadRequestException('Unknown report');
    }
  }

  async exportReport(q: ReportExportQueryDto, res: Response) {
    const rows = await this.flatRowsForExport(q);
    const filename = `report-${q.report}`;

    if (q.format === 'csv') {
      if (!rows.length) {
        res.setHeader('Content-Type', 'text/csv');
        res.send('');
        return;
      }
      const csv = parse(rows, { fields: Object.keys(rows[0]) });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}.csv"`,
      );
      res.send(csv);
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');
    if (rows.length) {
      ws.columns = Object.keys(rows[0]).map((k) => ({
        header: k,
        key: k,
        width: 18,
      }));
      rows.forEach((r) => ws.addRow(r));
    }
    const buf = await wb.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`,
    );
    res.send(Buffer.from(buf));
  }
}
