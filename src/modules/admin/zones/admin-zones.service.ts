import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from '../../../database/entities/zone.entity';
import { ZoneCoordinate } from '../../../database/entities/zone-coordinate.entity';
import { DriverZone } from '../../../database/entities/driver-zone.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

export interface ZoneWithCoordinates {
  id: string;
  zone_name: string;
  city: string | null;
  created_at: Date;
  updated_at: Date;
  coordinates: { latitude: number; longitude: number; sequence_order: number }[];
}

export interface ZoneListResponse {
  data: ZoneWithCoordinates[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface ZoneDriverInfo {
  id: string;
  driver_id: string;
  zone_id: string;
  created_at: Date;
  driver: {
    id: string;
    name: string | null;
    mobile_number: string;
    status: string;
  } | null;
}

@Injectable()
export class AdminZonesService {
  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(ZoneCoordinate)
    private readonly zoneCoordinateRepo: Repository<ZoneCoordinate>,
    @InjectRepository(DriverZone)
    private readonly driverZoneRepo: Repository<DriverZone>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async createZone(
    dto: CreateZoneDto,
    adminId: string,
  ): Promise<ZoneWithCoordinates> {
    const zone = this.zoneRepo.create({
      zone_name: dto.zone_name,
      city: dto.city ?? undefined,
    });
    const savedZone = await this.zoneRepo.save(zone);

    if (dto.coordinates && dto.coordinates.length > 0) {
      const coords = dto.coordinates.map((c, idx) =>
        this.zoneCoordinateRepo.create({
          zone_id: savedZone.id,
          latitude: c.latitude,
          longitude: c.longitude,
          sequence_order: c.sequence_order ?? idx,
        }),
      );
      await this.zoneCoordinateRepo.save(coords);
    }

    await this.createAuditLog(adminId, 'CREATE_ZONE', 'zones', savedZone.id, {
      zone_name: dto.zone_name,
    });

    return this.getZoneById(savedZone.id);
  }

  async listZones(
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<ZoneListResponse> {
    const skip = (page - 1) * limit;
    const qb = this.zoneRepo
      .createQueryBuilder('z')
      .leftJoinAndSelect('z.coordinates', 'zc')
      .orderBy('z.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(LOWER(z.zone_name) LIKE LOWER(:search) OR LOWER(COALESCE(z.city, \'\')) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [zones, total] = await qb.getManyAndCount();
    const data = zones.map((z) => this.formatZoneWithCoordinates(z));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getZoneById(id: string): Promise<ZoneWithCoordinates> {
    const zone = await this.zoneRepo.findOne({
      where: { id },
      relations: ['coordinates'],
    });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }
    return this.formatZoneWithCoordinates(zone);
  }

  async updateZone(
    id: string,
    dto: UpdateZoneDto,
    adminId: string,
  ): Promise<ZoneWithCoordinates> {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    if (dto.zone_name !== undefined) zone.zone_name = dto.zone_name;
    if (dto.city !== undefined) zone.city = dto.city;
    await this.zoneRepo.save(zone);

    if (dto.coordinates && dto.coordinates.length > 0) {
      await this.zoneCoordinateRepo.delete({ zone_id: id });
      const coords = dto.coordinates.map((c, idx) =>
        this.zoneCoordinateRepo.create({
          zone_id: id,
          latitude: c.latitude,
          longitude: c.longitude,
          sequence_order: c.sequence_order ?? idx,
        }),
      );
      await this.zoneCoordinateRepo.save(coords);
    }

    await this.createAuditLog(adminId, 'UPDATE_ZONE', 'zones', id, {
      zone_name: zone.zone_name,
    });

    return this.getZoneById(id);
  }

  async deleteZone(id: string, adminId: string): Promise<{ message: string }> {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    await this.zoneRepo.remove(zone);
    await this.createAuditLog(adminId, 'DELETE_ZONE', 'zones', id, {
      zone_name: zone.zone_name,
    });

    return { message: 'Zone deleted successfully' };
  }

  async assignDriverToZone(
    zoneId: string,
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const zone = await this.zoneRepo.findOne({ where: { id: zoneId } });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const existing = await this.driverZoneRepo.findOne({
      where: { zone_id: zoneId, driver_id: driverId },
    });
    if (existing) {
      throw new ConflictException('Driver is already assigned to this zone');
    }

    const driverZone = this.driverZoneRepo.create({
      zone_id: zoneId,
      driver_id: driverId,
    });
    await this.driverZoneRepo.save(driverZone);

    await this.createAuditLog(adminId, 'ASSIGN_DRIVER_TO_ZONE', 'driver_zones', driverZone.id, {
      zone_id: zoneId,
      driver_id: driverId,
    });

    return { message: 'Driver assigned to zone successfully' };
  }

  async removeDriverFromZone(
    zoneId: string,
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const driverZone = await this.driverZoneRepo.findOne({
      where: { zone_id: zoneId, driver_id: driverId },
    });
    if (!driverZone) {
      throw new NotFoundException('Driver is not assigned to this zone');
    }

    await this.driverZoneRepo.remove(driverZone);
    await this.createAuditLog(adminId, 'REMOVE_DRIVER_FROM_ZONE', 'driver_zones', driverZone.id, {
      zone_id: zoneId,
      driver_id: driverId,
    });

    return { message: 'Driver removed from zone successfully' };
  }

  async listDriversInZone(
    zoneId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: ZoneDriverInfo[];
    meta: { total: number; page: number; limit: number; total_pages: number };
  }> {
    const zone = await this.zoneRepo.findOne({ where: { id: zoneId } });
    if (!zone) {
      throw new NotFoundException('Zone not found');
    }

    const skip = (page - 1) * limit;
    const [driverZones, total] = await this.driverZoneRepo.findAndCount({
      where: { zone_id: zoneId },
      relations: ['driver'],
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    const data: ZoneDriverInfo[] = driverZones.map((dz) => ({
      id: dz.id,
      driver_id: dz.driver_id,
      zone_id: dz.zone_id,
      created_at: dz.created_at,
      driver: dz.driver
        ? {
            id: dz.driver.id,
            name: dz.driver.name,
            mobile_number: dz.driver.mobile_number,
            status: dz.driver.status as string,
          }
        : null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  private formatZoneWithCoordinates(zone: Zone & { coordinates?: ZoneCoordinate[] }): ZoneWithCoordinates {
    return {
      id: zone.id,
      zone_name: zone.zone_name,
      city: zone.city,
      created_at: zone.created_at,
      updated_at: zone.updated_at,
      coordinates: (zone.coordinates ?? [])
        .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
        .map((c) => ({
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
          sequence_order: c.sequence_order ?? 0,
        })),
    };
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const audit = this.auditLogRepo.create({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? undefined,
    });
    await this.auditLogRepo.save(audit);
  }
}
