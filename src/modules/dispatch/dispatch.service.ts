import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { BookingStatus } from '../../database/entities/booking.entity';
import { BookingDriverAssignment } from '../../database/entities/booking-driver-assignment.entity';
import { Driver } from '../../database/entities/driver.entity';
import { DriverStatus as DriverStatusEnum } from '../../database/entities/driver.entity';
import { DriverStatusEntity } from '../../database/entities/driver-status.entity';
import { DriverLocation } from '../../database/entities/driver-location.entity';
import { DriverZone } from '../../database/entities/driver-zone.entity';
import {
  Ambulance,
  AmbulanceStatus,
} from '../../database/entities/ambulance.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { FCM_NOTIFICATION_SERVICE } from '../../shared/notifications/interfaces/fcm-notification.interface';
import { FcmNoopService } from '../../shared/notifications/fcm-noop.service';
import { Inject } from '@nestjs/common';

const DISPATCH_RADIUS_KM = 100;

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface AvailableDriverItem {
  driver_id: string;
  name: string | null;
  mobile_number: string;
  latitude: number;
  longitude: number;
  last_seen: Date | null;
  ambulance_type_id: string;
}

export interface FindDriverResult {
  driver_id: string;
  name: string | null;
  mobile_number: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingDriverAssignment)
    private readonly assignmentRepo: Repository<BookingDriverAssignment>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(DriverStatusEntity)
    private readonly driverStatusRepo: Repository<DriverStatusEntity>,
    @InjectRepository(DriverLocation)
    private readonly driverLocationRepo: Repository<DriverLocation>,
    @InjectRepository(DriverZone)
    private readonly driverZoneRepo: Repository<DriverZone>,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(FCM_NOTIFICATION_SERVICE)
    private readonly fcmService: FcmNoopService,
  ) {}

  async manualAssign(
    bookingId: string,
    driverId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ message: string; assignment_id: string }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['ambulance_type'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    if (driver.status !== DriverStatusEnum.APPROVED || driver.is_blocked) {
      throw new BadRequestException('Driver is not approved or is blocked');
    }

    const validStatuses = [
      BookingStatus.SEARCHING,
      BookingStatus.DRIVER_ASSIGNED,
      BookingStatus.NO_DRIVER_FOUND,
    ];
    if (!validStatuses.includes(booking.status as BookingStatus)) {
      throw new BadRequestException(
        `Cannot assign driver to booking with status: ${booking.status}`,
      );
    }

    await this.assignmentRepo.update(
      { booking_id: bookingId, is_current: true },
      { is_current: false },
    );

    const assignment = this.assignmentRepo.create({
      booking_id: bookingId,
      driver_id: driverId,
      is_current: true,
    });
    const saved = await this.assignmentRepo.save(assignment);

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.DRIVER_ASSIGNED,
    });

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: 'MANUAL_ASSIGN_DRIVER',
        entity_type: 'bookings',
        entity_id: bookingId,
        metadata: { driver_id: driverId, assignment_id: saved.id },
        ip_address: ipAddress,
      }),
    );

    if (driver.fcm_token) {
      await this.fcmService.sendToToken(driver.fcm_token, {
        title: 'New Ride Request',
        body: 'You have been assigned a new ride request.',
        data: { type: 'ride_request', booking_id: bookingId },
      });
    }

    return {
      message: 'Driver assigned successfully',
      assignment_id: saved.id,
    };
  }

  async cancelAssignment(
    bookingId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    await this.assignmentRepo.update(
      { booking_id: bookingId, is_current: true },
      { is_current: false, rejected_at: new Date() },
    );

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.SEARCHING,
    });

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: 'CANCEL_DRIVER_ASSIGNMENT',
        entity_type: 'bookings',
        entity_id: bookingId,
        ip_address: ipAddress,
      }),
    );

    return { message: 'Assignment cancelled' };
  }

  async availableDrivers(zoneId: string): Promise<AvailableDriverItem[]> {
    const driverZones = await this.driverZoneRepo.find({
      where: { zone_id: zoneId },
      relations: ['driver', 'zone'],
    });
    const driverIds = driverZones.map((dz) => dz.driver_id);

    if (driverIds.length === 0) {
      return [];
    }

    console.log('driver ids', driverIds);

    const [drivers, locations, statuses] = await Promise.all([
      this.driverRepo
        .createQueryBuilder('d')
        .where('d.id IN (:...ids)', { ids: driverIds })
        .andWhere('d.status = :status', { status: DriverStatusEnum.APPROVED })
        .andWhere('d.is_blocked = false')
        .getMany(),
      this.driverLocationRepo
        .createQueryBuilder('dl')
        .where('dl.driver_id IN (:...ids)', { ids: driverIds })
        .getMany(),
      this.driverStatusRepo
        .createQueryBuilder('ds')
        .where('ds.driver_id IN (:...ids)', { ids: driverIds })
        .andWhere('ds.is_online = true')
        .getMany(),
    ]);

    const onlineDriverIds = new Set(
      statuses.map((s) => s.driver_id).filter(Boolean),
    );
    const locationMap = new Map(locations.map((l) => [l.driver_id, l]));
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const ambulances = await this.ambulanceRepo.find({
      where: { driver_id: In(Array.from(onlineDriverIds)) },
    });
    const ambulanceByDriver = new Map(ambulances.map((a) => [a.driver_id, a]));

    const result: AvailableDriverItem[] = [];
    for (const driverId of onlineDriverIds) {
      const driver = driverMap.get(driverId);
      const loc = locationMap.get(driverId);
      const ambulance = ambulanceByDriver.get(driverId);
      if (driver && loc) {
        result.push({
          driver_id: driver.id,
          name: driver.name,
          mobile_number: driver.mobile_number,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          last_seen: null,
          ambulance_type_id: ambulance?.ambulance_type_id ?? '',
        });
      }
    }
    return result;
  }

  async findDriver(
    bookingId: string,
    radiusKm: number = DISPATCH_RADIUS_KM,
  ): Promise<FindDriverResult | null> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['ambulance_type'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const pickupLat = Number(booking.pickup_latitude);
    const pickupLon = Number(booking.pickup_longitude);
    const ambulanceTypeId = booking.ambulance_type_id;

    const ambulances = await this.ambulanceRepo.find({
      where: {
        ambulance_type_id: ambulanceTypeId,
        status: AmbulanceStatus.APPROVED,
      },
      relations: ['driver'],
    });
    const driverIds = ambulances
      .map((a) => a.driver_id)
      .filter((id): id is string => !!id);

    if (driverIds.length === 0) {
      return null;
    }

    const [locations, statuses] = await Promise.all([
      this.driverLocationRepo.find({ where: { driver_id: In(driverIds) } }),
      this.driverStatusRepo.find({
        where: { driver_id: In(driverIds) },
      }),
    ]);

    const onlineIds = new Set(
      statuses
        .filter((s) => s.is_online && !s.current_booking_id)
        .map((s) => s.driver_id),
    );
    const locationMap = new Map(locations.map((l) => [l.driver_id, l]));
    const driverMap = new Map(
      ambulances.map((a) => [a.driver_id, a.driver]).filter(([, d]) => d) as [
        string,
        Driver,
      ][],
    );

    let nearest: FindDriverResult | null = null;
    let minDist = radiusKm + 1;

    for (const driverId of onlineIds) {
      const loc = locationMap.get(driverId);
      const driver = driverMap.get(driverId);
      if (!loc || !driver) continue;

      const dist = haversineDistanceKm(
        pickupLat,
        pickupLon,
        Number(loc.latitude),
        Number(loc.longitude),
      );
      if (dist <= radiusKm && dist < minDist) {
        minDist = dist;
        nearest = {
          driver_id: driver.id,
          name: driver.name,
          mobile_number: driver.mobile_number,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          distance_km: Math.round(dist * 100) / 100,
        };
      }
    }
    return nearest;
  }

  async assignDriver(
    bookingId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ message: string; assignment_id?: string }> {
    const nearest = await this.findDriver(bookingId);
    if (!nearest) {
      return {
        message: 'No available driver found within radius',
      };
    }
    const result = await this.manualAssign(
      bookingId,
      nearest.driver_id,
      adminId,
      ipAddress,
    );
    return {
      message: 'Driver auto-assigned',
      assignment_id: result.assignment_id,
    };
  }

  async retryAssignment(
    bookingId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ message: string; assignment_id?: string }> {
    const current = await this.assignmentRepo.findOne({
      where: { booking_id: bookingId, is_current: true },
    });
    if (current) {
      await this.assignmentRepo.update(current.id, {
        is_current: false,
        rejected_at: new Date(),
      });
    }
    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.SEARCHING,
    });
    return this.assignDriver(bookingId, adminId, ipAddress);
  }

  async driverTimeout(
    assignmentId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['booking'],
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.accepted_at) {
      throw new BadRequestException('Driver already accepted');
    }

    await this.assignmentRepo.update(assignmentId, {
      is_current: false,
      timeout_at: new Date(),
    });

    await this.bookingRepo.update(assignment.booking_id, {
      status: BookingStatus.SEARCHING,
    });

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: 'DRIVER_TIMEOUT',
        entity_type: 'booking_driver_assignments',
        entity_id: assignmentId,
        metadata: { booking_id: assignment.booking_id },
        ip_address: ipAddress,
      }),
    );

    return { message: 'Timeout processed, booking is searching again' };
  }
}
