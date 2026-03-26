import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RideDetails } from '../../../database/entities/ride-details.entity';
import { RideTracking } from '../../../database/entities/ride-tracking.entity';
import { DriverLocation } from '../../../database/entities/driver-location.entity';
import { DriverStatusEntity } from '../../../database/entities/driver-status.entity';
import { User } from '../../../database/entities/user.entity';
import { Driver } from '../../../database/entities/driver.entity';
import {
  DriverDocument,
  DocumentType,
} from '../../../database/entities/driver-document.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

@Injectable()
export class AdminFraudService {
  constructor(
    @InjectRepository(RideDetails)
    private readonly rideDetailsRepo: Repository<RideDetails>,
    @InjectRepository(RideTracking)
    private readonly trackingRepo: Repository<RideTracking>,
    @InjectRepository(DriverLocation)
    private readonly driverLocationRepo: Repository<DriverLocation>,
    @InjectRepository(DriverStatusEntity)
    private readonly driverStatusRepo: Repository<DriverStatusEntity>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(DriverDocument)
    private readonly driverDocumentRepo: Repository<DriverDocument>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async rideAnomalies() {
    const rows = await this.rideDetailsRepo
      .createQueryBuilder('rd')
      .innerJoinAndSelect('rd.booking', 'b')
      .where('rd.total_distance_km IS NOT NULL')
      .andWhere('rd.total_duration_min IS NOT NULL')
      .andWhere('rd.total_duration_min > 0')
      .getMany();

    const anomalies: Array<{
      booking_id: string;
      reason: string;
      total_distance_km: number;
      total_duration_min: number;
      implied_speed_kmh: number;
      straight_line_km: number | null;
    }> = [];

    for (const rd of rows) {
      const b = rd.booking;
      if (!b) continue;
      const dist = Number(rd.total_distance_km);
      const durMin = Number(rd.total_duration_min);
      const hours = durMin / 60;
      const implied = hours > 0 ? dist / hours : 0;
      const straight = haversineKm(
        Number(b.pickup_latitude),
        Number(b.pickup_longitude),
        Number(b.drop_latitude),
        Number(b.drop_longitude),
      );

      let reason: string | null = null;
      if (implied > 150) {
        reason = `Implied average speed ${implied.toFixed(1)} km/h exceeds threshold`;
      } else if (dist < 0.5 && durMin > 90) {
        reason = 'Very short distance with very long duration';
      } else if (straight > 1 && dist / straight > 3) {
        reason = `Reported distance (${dist.toFixed(2)} km) >> straight-line (${straight.toFixed(2)} km)`;
      }

      if (reason) {
        anomalies.push({
          booking_id: rd.booking_id,
          reason,
          total_distance_km: dist,
          total_duration_min: durMin,
          implied_speed_kmh: implied,
          straight_line_km: straight,
        });
      }
    }

    return { data: anomalies, count: anomalies.length };
  }

  async gpsMismatch() {
    const bookings = await this.trackingRepo
      .createQueryBuilder('rt')
      .select('rt.booking_id', 'booking_id')
      .addSelect('COUNT(rt.id)', 'cnt')
      .groupBy('rt.booking_id')
      .having('COUNT(rt.id) >= 3')
      .getRawMany<{ booking_id: string; cnt: string }>();

    const out: Array<{
      booking_id: string;
      straight_line_km: number;
      path_length_km: number;
      ratio: number;
    }> = [];

    for (const row of bookings) {
      const bookingId = row.booking_id;
      const points = await this.trackingRepo.find({
        where: { booking_id: bookingId },
        order: { recorded_at: 'ASC' },
      });
      if (points.length < 3) continue;
      const first = points[0];
      const last = points[points.length - 1];
      const straight = haversineKm(
        Number(first.latitude),
        Number(first.longitude),
        Number(last.latitude),
        Number(last.longitude),
      );
      let path = 0;
      for (let i = 1; i < points.length; i++) {
        path += haversineKm(
          Number(points[i - 1].latitude),
          Number(points[i - 1].longitude),
          Number(points[i].latitude),
          Number(points[i].longitude),
        );
      }
      if (straight < 0.1) continue;
      const ratio = path / straight;
      if (ratio > 1.6) {
        out.push({
          booking_id: bookingId,
          straight_line_km: straight,
          path_length_km: path,
          ratio,
        });
      }
    }

    return { data: out, count: out.length };
  }

  async fakeLocationDrivers() {
    const staleHours = 24;
    const locations = await this.driverLocationRepo.find({
      relations: ['driver'],
    });

    const statusRows = await this.driverStatusRepo.find();
    const onlineByDriver = new Map(
      statusRows.map((s) => [s.driver_id, s.is_online]),
    );

    const suspects: Array<{
      driver_id: string;
      reason: string;
      latitude: number;
      longitude: number;
      location_updated_at: Date;
      is_online: boolean;
    }> = [];

    const now = Date.now();
    for (const l of locations) {
      const lat = Number(l.latitude);
      const lng = Number(l.longitude);
      const online = onlineByDriver.get(l.driver_id) ?? l.driver?.is_online;
      if (Math.abs(lat) < 1e-6 && Math.abs(lng) < 1e-6) {
        suspects.push({
          driver_id: l.driver_id,
          reason: 'Coordinates at null island (0,0)',
          latitude: lat,
          longitude: lng,
          location_updated_at: l.updated_at,
          is_online: !!online,
        });
        continue;
      }
      if (online) {
        const ageMs = now - new Date(l.updated_at).getTime();
        if (ageMs > staleHours * 3600 * 1000) {
          suspects.push({
            driver_id: l.driver_id,
            reason: `Location not updated for > ${staleHours}h while online`,
            latitude: lat,
            longitude: lng,
            location_updated_at: l.updated_at,
            is_online: true,
          });
        }
      }
    }

    return { data: suspects, count: suspects.length };
  }

  async duplicateAccounts() {
    const userDups = await this.userRepo
      .createQueryBuilder('u')
      .select('u.mobile_number', 'mobile_number')
      .addSelect('COUNT(u.id)', 'cnt')
      .groupBy('u.mobile_number')
      .having('COUNT(u.id) > 1')
      .getRawMany<{ mobile_number: string; cnt: string }>();

    const driverDups = await this.driverRepo
      .createQueryBuilder('d')
      .select('d.mobile_number', 'mobile_number')
      .addSelect('COUNT(d.id)', 'cnt')
      .groupBy('d.mobile_number')
      .having('COUNT(d.id) > 1')
      .getRawMany<{ mobile_number: string; cnt: string }>();

    const panDups = await this.driverDocumentRepo
      .createQueryBuilder('doc')
      .select('doc.document_url', 'document_url')
      .addSelect('COUNT(doc.id)', 'cnt')
      .where('doc.document_type = :dt', { dt: DocumentType.PAN })
      .groupBy('doc.document_url')
      .having('COUNT(doc.id) > 1')
      .getRawMany<{ document_url: string; cnt: string }>();

    const userDriverSameMobile = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin(Driver, 'd', 'd.mobile_number = u.mobile_number')
      .select('u.mobile_number', 'mobile_number')
      .addSelect('u.id', 'user_id')
      .addSelect('d.id', 'driver_id')
      .limit(500)
      .getRawMany<{
        mobile_number: string;
        user_id: string;
        driver_id: string;
      }>();

    return {
      duplicate_user_mobiles: userDups.map((r) => ({
        mobile_number: r.mobile_number,
        count: parseInt(r.cnt, 10),
      })),
      duplicate_driver_mobiles: driverDups.map((r) => ({
        mobile_number: r.mobile_number,
        count: parseInt(r.cnt, 10),
      })),
      duplicate_pan_documents: panDups.map((r) => ({
        document_url: r.document_url,
        count: parseInt(r.cnt, 10),
      })),
      user_and_driver_same_mobile: userDriverSameMobile,
    };
  }

  async flagDriver(
    driverId: string,
    adminId: string,
    reason?: string,
    ipAddress?: string,
  ) {
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const before = this.fraudFieldsSnapshot(
      driver.fraud_flagged_at,
      driver.fraud_flag_reason,
    );
    const flaggedReason =
      reason?.trim() || 'Flagged for fraud review';
    const flaggedAt = new Date();

    await this.driverRepo.update(driverId, {
      fraud_flagged_at: flaggedAt,
      fraud_flag_reason: flaggedReason,
    });

    const after = this.fraudFieldsSnapshot(flaggedAt, flaggedReason);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: 'FLAG_DRIVER',
        entity_type: 'drivers',
        entity_id: driverId,
        metadata: {
          before,
          after,
          source: 'fraud_detection',
        },
        ip_address: ipAddress,
      }),
    );
    return { message: 'Driver flagged for review' };
  }

  async flagUser(
    userId: string,
    adminId: string,
    reason?: string,
    ipAddress?: string,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const before = this.fraudFieldsSnapshot(
      user.fraud_flagged_at,
      user.fraud_flag_reason,
    );
    const flaggedReason =
      reason?.trim() || 'Flagged for fraud review';
    const flaggedAt = new Date();

    await this.userRepo.update(userId, {
      fraud_flagged_at: flaggedAt,
      fraud_flag_reason: flaggedReason,
    });

    const after = this.fraudFieldsSnapshot(flaggedAt, flaggedReason);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: 'FLAG_USER',
        entity_type: 'users',
        entity_id: userId,
        metadata: {
          before,
          after,
          source: 'fraud_detection',
        },
        ip_address: ipAddress,
      }),
    );
    return { message: 'User flagged for review' };
  }

  private fraudFieldsSnapshot(
    flaggedAt: Date | string | null | undefined,
    flagReason: string | null | undefined,
  ): { fraud_flagged_at: string | null; fraud_flag_reason: string | null } {
    return {
      fraud_flagged_at: flaggedAt
        ? new Date(flaggedAt).toISOString()
        : null,
      fraud_flag_reason: flagReason ?? null,
    };
  }
}
