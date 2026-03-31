import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverLocation } from '../../../database/entities/driver-location.entity';
import { Ambulance, AmbulanceStatus } from '../../../database/entities/ambulance.entity';
import { AmbulanceType } from '../../../database/entities/ambulance-type.entity';
import { Driver, DriverStatus } from '../../../database/entities/driver.entity';
import { assertValidCoordinates } from '../../../common/utils/geo';
import { DEFAULT_DISPATCH_SEARCH_RADIUS_KM } from '../../../common/constants/dispatch.constants';

@Injectable()
export class UserAmbulanceService {
  constructor(
    @InjectRepository(DriverLocation)
    private readonly locationRepo: Repository<DriverLocation>,
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(AmbulanceType)
    private readonly typeRepo: Repository<AmbulanceType>,
    private readonly config: ConfigService,
  ) {}

  listTypes() {
    return this.typeRepo.find({ order: { name: 'ASC' } });
  }

  /**
   * Approved + online drivers with approved ambulances within DISPATCH_SEARCH_RADIUS_KM (project §7).
   */
  async findNearby(
    latitude: number,
    longitude: number,
    ambulanceTypeId?: string,
  ) {
    assertValidCoordinates(latitude, longitude);
    const radius =
      Number(this.config.get('DISPATCH_RADIUS_KM')) ||
      DEFAULT_DISPATCH_SEARCH_RADIUS_KM;

    const distanceSql = `(
      6371 * acos(least(1, greatest(-1,
        sin(radians(:lat)) * sin(radians(dl.latitude))
        + cos(radians(:lat)) * cos(radians(dl.latitude)) * cos(radians(dl.longitude) - radians(:lng))
      )))
    )`;

    const qb = this.locationRepo
      .createQueryBuilder('dl')
      .innerJoin(Driver, 'driver', 'driver.id = dl.driver_id')
      .innerJoin(Ambulance, 'amb', 'amb.driver_id = driver.id')
      .innerJoin(AmbulanceType, 'at', 'at.id = amb.ambulance_type_id')
      .where('driver.status = :dstat', { dstat: DriverStatus.APPROVED })
      .andWhere('driver.is_blocked = false')
      .andWhere('driver.is_online = true')
      .andWhere('amb.status = :astat', { astat: AmbulanceStatus.APPROVED });

    if (ambulanceTypeId) {
      qb.andWhere('amb.ambulance_type_id = :tid', { tid: ambulanceTypeId });
    }

    qb
      .andWhere(`${distanceSql} <= :radius`, {
        lat: latitude,
        lng: longitude,
        radius,
      })
      .select('amb.id', 'ambulance_id')
      .addSelect('amb.registration_number', 'registration_number')
      .addSelect('amb.vehicle_number', 'vehicle_number')
      .addSelect('amb.photo_url', 'ambulance_photo_url')
      .addSelect('driver.id', 'driver_id')
      .addSelect('driver.name', 'driver_name')
      .addSelect('driver.rating', 'driver_rating')
      .addSelect('dl.latitude', 'latitude')
      .addSelect('dl.longitude', 'longitude')
      .addSelect('at.id', 'ambulance_type_id')
      .addSelect('at.name', 'ambulance_type_name')
      .addSelect(distanceSql, 'distance_km')
      .orderBy('distance_km', 'ASC')
      .setParameters({ lat: latitude, lng: longitude, radius });

    const raw = await qb.getRawMany();
    return raw.map((row) => ({
      ambulance_id: row.ambulance_id,
      registration_number: row.registration_number,
      vehicle_number: row.vehicle_number,
      ambulance_photo_url: row.ambulance_photo_url,
      distance_km: Number(row.distance_km),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      ambulance_type: {
        id: row.ambulance_type_id,
        name: row.ambulance_type_name,
      },
      driver: {
        id: row.driver_id,
        name: row.driver_name,
        rating: row.driver_rating != null ? Number(row.driver_rating) : null,
      },
    }));
  }

  async getDetails(ambulanceId: string) {
    const amb = await this.ambulanceRepo.findOne({
      where: { id: ambulanceId, status: AmbulanceStatus.APPROVED },
      relations: {
        driver: true,
        ambulance_type: true,
        equipment: true,
      },
    });
    if (!amb) {
      throw new NotFoundException('Ambulance not found');
    }
    if (
      amb.driver.status !== DriverStatus.APPROVED ||
      amb.driver.is_blocked
    ) {
      throw new NotFoundException('Ambulance not found');
    }

    return {
      id: amb.id,
      registration_number: amb.registration_number,
      vehicle_number: amb.vehicle_number,
      photo_url: amb.photo_url,
      insurance_expiry: amb.insurance_expiry,
      ambulance_type: amb.ambulance_type
        ? {
            id: amb.ambulance_type.id,
            name: amb.ambulance_type.name,
            description: amb.ambulance_type.description,
          }
        : null,
      equipment: (amb.equipment ?? []).map((e) => ({
        id: e.id,
        name: e.name,
      })),
      driver: {
        id: amb.driver.id,
        name: amb.driver.name,
        rating: amb.driver.rating,
        profile_photo: amb.driver.profile_photo,
      },
    };
  }
}
