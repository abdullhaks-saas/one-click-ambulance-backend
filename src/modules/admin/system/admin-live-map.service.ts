import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DriverLocation } from '../../../database/entities/driver-location.entity';
import { DriverStatusEntity } from '../../../database/entities/driver-status.entity';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.DRIVER_ACCEPTED,
  BookingStatus.DRIVER_ON_WAY,
  BookingStatus.DRIVER_ARRIVED,
  BookingStatus.PATIENT_ONBOARD,
  BookingStatus.TRIP_STARTED,
];

@Injectable()
export class AdminLiveMapService {
  constructor(
    @InjectRepository(DriverLocation)
    private readonly locationRepo: Repository<DriverLocation>,
    @InjectRepository(DriverStatusEntity)
    private readonly statusRepo: Repository<DriverStatusEntity>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async getLiveMap() {
    const [locations, statuses, activeBookings] = await Promise.all([
      this.locationRepo.find({ relations: ['driver'] }),
      this.statusRepo.find(),
      this.bookingRepo.find({
        where: { status: In(ACTIVE_BOOKING_STATUSES as unknown as string[]) },
        relations: ['user', 'zone'],
        order: { updated_at: 'DESC' },
        take: 200,
      }),
    ]);

    const statusByDriver = new Map(statuses.map((s) => [s.driver_id, s]));

    return {
      drivers: locations.map((l) => ({
        driver_id: l.driver_id,
        latitude: Number(l.latitude),
        longitude: Number(l.longitude),
        heading: l.heading != null ? Number(l.heading) : null,
        location_updated_at: l.updated_at,
        driver_name: l.driver?.name,
        driver_mobile: l.driver?.mobile_number,
        is_online:
          statusByDriver.get(l.driver_id)?.is_online ?? l.driver?.is_online,
        current_booking_id:
          statusByDriver.get(l.driver_id)?.current_booking_id ?? null,
      })),
      active_bookings: activeBookings.map((b) => ({
        id: b.id,
        status: b.status,
        pickup_latitude: Number(b.pickup_latitude),
        pickup_longitude: Number(b.pickup_longitude),
        drop_latitude: Number(b.drop_latitude),
        drop_longitude: Number(b.drop_longitude),
        user_mobile: b.user?.mobile_number,
        zone_name: b.zone?.zone_name,
        updated_at: b.updated_at,
      })),
    };
  }
}
