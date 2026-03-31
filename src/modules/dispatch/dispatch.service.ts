import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from '../../database/entities/booking.entity';
import { BookingStatus } from '../../database/entities/booking.entity';
import { BookingStatusHistory } from '../../database/entities/booking-status-history.entity';
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
export class DispatchService implements OnModuleDestroy {
  private readonly logger = new Logger(DispatchService.name);

  /** One pending accept timer per booking (customer auto-dispatch). */
  private readonly pendingOfferTimerByBooking = new Map<
    string,
    NodeJS.Timeout
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepo: Repository<BookingStatusHistory>,
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

  onModuleDestroy(): void {
    for (const t of this.pendingOfferTimerByBooking.values()) {
      clearTimeout(t);
    }
    this.pendingOfferTimerByBooking.clear();
  }

  clearCustomerDispatchTimersForBooking(bookingId: string): void {
    this.clearOfferTimerForBooking(bookingId);
  }

  private clearOfferTimerForBooking(bookingId: string): void {
    const t = this.pendingOfferTimerByBooking.get(bookingId);
    if (t) {
      clearTimeout(t);
      this.pendingOfferTimerByBooking.delete(bookingId);
    }
  }

  private scheduleCustomerOfferTimeout(
    bookingId: string,
    assignmentId: string,
  ): void {
    this.clearOfferTimerForBooking(bookingId);
    const sec = Math.max(
      5,
      Number(this.configService.get('DISPATCH_TIMEOUT_SECONDS') ?? 15),
    );
    const timer = setTimeout(() => {
      void this.handleCustomerDispatchOfferTimeout(assignmentId).catch((err) =>
        this.logger.error(
          `Dispatch timeout handler failed for ${assignmentId}: ${err}`,
        ),
      );
    }, sec * 1000);
    this.pendingOfferTimerByBooking.set(bookingId, timer);
  }

  private async appendBookingStatusHistory(
    bookingId: string,
    status: BookingStatus | string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.statusHistoryRepo.save(
      this.statusHistoryRepo.create({
        booking_id: bookingId,
        status: status as string,
        metadata,
      }),
    );
  }

  /**
   * Next nearest driver not yet offered for this booking (project plan §7 cascade).
   * Caller schedules accept timeout via {@link scheduleCustomerOfferTimeout}.
   */
  async offerNextDriverForBooking(bookingId: string): Promise<{
    offered: boolean;
    driver_id?: string;
    assignment_id?: string;
  }> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.status === BookingStatus.NO_DRIVER_FOUND ||
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.FORCE_CANCELLED ||
      booking.status === BookingStatus.TRIP_COMPLETED
    ) {
      return { offered: false };
    }

    if (booking.status !== BookingStatus.SEARCHING) {
      return { offered: false };
    }

    const radiusKm = Number(this.configService.get('DISPATCH_RADIUS_KM') ?? 10);
    const attempted = await this.assignmentRepo.find({
      where: { booking_id: bookingId },
      select: ['driver_id'],
    });
    const excludeDriverIds = [...new Set(attempted.map((a) => a.driver_id))];

    const nearest = await this.findDriver(
      bookingId,
      radiusKm,
      excludeDriverIds,
    );
    if (!nearest) {
      await this.bookingRepo.update(bookingId, {
        status: BookingStatus.NO_DRIVER_FOUND,
      });
      await this.appendBookingStatusHistory(
        bookingId,
        BookingStatus.NO_DRIVER_FOUND,
        { source: 'customer_auto_dispatch' },
      );
      return { offered: false };
    }

    await this.assignmentRepo.update(
      { booking_id: bookingId, is_current: true },
      { is_current: false },
    );

    const assignment = this.assignmentRepo.create({
      booking_id: bookingId,
      driver_id: nearest.driver_id,
      is_current: true,
      assigned_at: new Date(),
    });
    const saved = await this.assignmentRepo.save(assignment);

    await this.bookingRepo.update(bookingId, {
      status: BookingStatus.DRIVER_ASSIGNED,
    });

    await this.appendBookingStatusHistory(
      bookingId,
      BookingStatus.DRIVER_ASSIGNED,
      {
        driver_id: nearest.driver_id,
        assignment_id: saved.id,
        source: 'customer_auto_dispatch',
      },
    );

    const driver = await this.driverRepo.findOne({
      where: { id: nearest.driver_id },
    });
    if (driver?.fcm_token) {
      await this.fcmService.sendToToken(driver.fcm_token, {
        title: 'New Ride Request',
        body: 'You have a new ride request nearby. Please accept soon.',
        data: {
          type: 'ride_request',
          booking_id: bookingId,
          assignment_id: saved.id,
        },
      });
    }

    return {
      offered: true,
      driver_id: nearest.driver_id,
      assignment_id: saved.id,
    };
  }

  private async handleCustomerDispatchOfferTimeout(
    assignmentId: string,
  ): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['booking'],
    });
    if (!assignment?.booking) {
      return;
    }

    const bookingId = assignment.booking_id;
    this.clearOfferTimerForBooking(bookingId);

    if (!assignment.is_current || assignment.accepted_at) {
      return;
    }

    await this.assignmentRepo.update(assignmentId, {
      is_current: false,
      timeout_at: new Date(),
    });
    await this.bookingRepo.update(bookingId, { status: BookingStatus.SEARCHING });

    const offer = await this.offerNextDriverForBooking(bookingId);
    if (offer.offered && offer.assignment_id) {
      this.scheduleCustomerOfferTimeout(bookingId, offer.assignment_id);
    }
  }

  /**
   * Driver app — use `POST /driver/ride-accept` (not admin `/dispatch/*`).
   */
  async driverAcceptRide(
    assignmentId: string,
    driverId: string,
  ): Promise<{ message: string }> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['booking'],
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.driver_id !== driverId) {
      throw new BadRequestException('This assignment belongs to another driver');
    }
    if (!assignment.is_current) {
      throw new BadRequestException('Assignment is no longer active');
    }
    if (assignment.accepted_at) {
      throw new BadRequestException('Ride already accepted');
    }

    const booking = assignment.booking;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== BookingStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException(
        `Cannot accept booking in status: ${booking.status}`,
      );
    }

    this.clearOfferTimerForBooking(booking.id);

    await this.assignmentRepo.update(assignmentId, {
      accepted_at: new Date(),
    });

    await this.bookingRepo.update(booking.id, {
      status: BookingStatus.DRIVER_ACCEPTED,
    });

    await this.appendBookingStatusHistory(
      booking.id,
      BookingStatus.DRIVER_ACCEPTED,
      { driver_id: driverId, assignment_id: assignmentId },
    );

    await this.driverStatusRepo.update(
      { driver_id: driverId },
      { current_booking_id: booking.id },
    );

    return { message: 'Ride accepted' };
  }

  /**
   * Driver app — use `POST /driver/ride-reject` (not admin `/dispatch/*`).
   */
  async driverRejectRide(
    assignmentId: string,
    driverId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['booking'],
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    if (assignment.driver_id !== driverId) {
      throw new BadRequestException('This assignment belongs to another driver');
    }
    if (!assignment.is_current) {
      throw new BadRequestException('Assignment is no longer active');
    }
    if (assignment.accepted_at) {
      throw new BadRequestException('Ride already accepted');
    }

    const booking = assignment.booking;
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    this.clearOfferTimerForBooking(booking.id);

    await this.assignmentRepo.update(assignmentId, {
      is_current: false,
      rejected_at: new Date(),
      rejection_reason: reason ?? 'rejected_by_driver',
    });

    await this.bookingRepo.update(booking.id, {
      status: BookingStatus.SEARCHING,
    });

    const offer = await this.offerNextDriverForBooking(booking.id);
    if (offer.offered && offer.assignment_id) {
      this.scheduleCustomerOfferTimeout(booking.id, offer.assignment_id);
    }

    return { message: 'Ride offer declined; searching for another driver' };
  }

  /**
   * Customer booking: first (or next) driver offer + accept window + cascade.
   * Internal — invoked from user booking create (not exposed as `/dispatch/*` for customers).
   */
  async startCustomerDispatch(bookingId: string): Promise<{
    offered: boolean;
    driver_id?: string;
    assignment_id?: string;
  }> {
    const offer = await this.offerNextDriverForBooking(bookingId);
    if (offer.offered && offer.assignment_id) {
      this.scheduleCustomerOfferTimeout(bookingId, offer.assignment_id);
    }
    return offer;
  }

  /**
   * @deprecated Use {@link startCustomerDispatch}.
   */
  async autoOfferNearestDriver(
    bookingId: string,
  ): Promise<{ offered: boolean; driver_id?: string; assignment_id?: string }> {
    return this.startCustomerDispatch(bookingId);
  }

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

    this.clearOfferTimerForBooking(bookingId);

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

    this.clearOfferTimerForBooking(bookingId);

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

  /**
   * @param radiusKm Search radius; defaults to env DISPATCH_RADIUS_KM (project plan: 10 km).
   */
  async findDriver(
    bookingId: string,
    radiusKm?: number,
    excludeDriverIds: string[] = [],
  ): Promise<FindDriverResult | null> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: ['ambulance_type'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const radius =
      radiusKm ??
      Number(this.configService.get('DISPATCH_RADIUS_KM') ?? 10);

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
    let minDist = radius + 1;

    const skip = new Set(excludeDriverIds);

    for (const driverId of onlineIds) {
      if (skip.has(driverId)) continue;
      const loc = locationMap.get(driverId);
      const driver = driverMap.get(driverId);
      if (!loc || !driver) continue;
      if (driver.status !== DriverStatusEnum.APPROVED || driver.is_blocked) {
        continue;
      }

      const dist = haversineDistanceKm(
        pickupLat,
        pickupLon,
        Number(loc.latitude),
        Number(loc.longitude),
      );
      if (dist <= radius && dist < minDist) {
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
    this.clearOfferTimerForBooking(bookingId);

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

    this.clearOfferTimerForBooking(assignment.booking_id);

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

  /**
   * Release active assignment and notify driver when the customer cancels pre-accept.
   */
  async userCancelBookingRelease(bookingId: string): Promise<void> {
    this.clearOfferTimerForBooking(bookingId);

    const current = await this.assignmentRepo.findOne({
      where: { booking_id: bookingId, is_current: true },
      relations: ['driver'],
    });

    if (current) {
      await this.assignmentRepo.update(current.id, {
        is_current: false,
        rejected_at: new Date(),
        rejection_reason: 'cancelled_by_user',
      });

      const driver = current.driver;
      if (driver?.fcm_token) {
        await this.fcmService.sendToToken(driver.fcm_token, {
          title: 'Ride cancelled',
          body: 'The customer cancelled this ride request.',
          data: { type: 'ride_cancelled', booking_id: bookingId },
        });
      }
    }

    await this.driverStatusRepo
      .createQueryBuilder()
      .update(DriverStatusEntity)
      .set({ current_booking_id: null })
      .where('current_booking_id = :bid', { bid: bookingId })
      .execute();
  }
}
