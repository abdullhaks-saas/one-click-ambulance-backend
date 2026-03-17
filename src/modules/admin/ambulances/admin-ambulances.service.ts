import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ambulance } from '../../../database/entities/ambulance.entity';
import { AmbulanceStatus } from '../../../database/entities/ambulance.entity';
import { AmbulanceEquipment } from '../../../database/entities/ambulance-equipment.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { AmbulanceListQueryDto } from './dto/ambulance-list-query.dto';
import { S3Service } from '../../../shared/s3/s3.service';

export interface AmbulanceDetailResponse {
  id: string;
  driver_id: string;
  ambulance_type_id: string;
  registration_number: string;
  vehicle_number: string | null;
  photo_url: string | null;
  insurance_expiry: string | null;
  status: AmbulanceStatus;
  suspend_reason: string | null;
  created_at: Date;
  updated_at: Date;
  ambulance_type: { id: string; name: string } | null;
  driver: { id: string; name: string | null } | null;
  equipment: { id: string; name: string }[];
}

@Injectable()
export class AdminAmbulancesService {
  constructor(
    @InjectRepository(Ambulance)
    private readonly ambulanceRepo: Repository<Ambulance>,
    @InjectRepository(AmbulanceEquipment)
    private readonly equipmentRepo: Repository<AmbulanceEquipment>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly s3Service: S3Service,
  ) {}

  async listAmbulances(
    query: AmbulanceListQueryDto,
  ): Promise<{
    data: (Omit<Ambulance, 'photo_url'> & { photo_url: string | null })[];
    meta: { total: number; page: number; limit: number; total_pages: number };
  }> {
    const { page = 1, limit = 20, status, ambulance_type_id, driver_id } =
      query;
    const skip = (page - 1) * limit;

    const qb = this.ambulanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.ambulance_type', 'at')
      .leftJoinAndSelect('a.driver', 'd')
      .orderBy('a.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('a.status = :status', { status });
    }
    if (ambulance_type_id) {
      qb.andWhere('a.ambulance_type_id = :ambulance_type_id', {
        ambulance_type_id,
      });
    }
    if (driver_id) {
      qb.andWhere('a.driver_id = :driver_id', { driver_id });
    }
    if (query.search) {
      qb.andWhere(
        '(a.registration_number LIKE :search OR a.vehicle_number LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      rows.map(async (ambulance) => {
        const photo_url = ambulance.photo_url
          ? await this.s3Service.getSignedUrl(ambulance.photo_url)
          : null;
        return { ...ambulance, photo_url };
      }),
    );

    return {
      data: data as Array<Omit<Ambulance, 'photo_url'> & { photo_url: string | null }>,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getAmbulanceById(id: string): Promise<AmbulanceDetailResponse> {
    const ambulance = await this.ambulanceRepo.findOne({
      where: { id },
      relations: ['ambulance_type', 'driver', 'equipment'],
    });
    if (!ambulance) {
      throw new NotFoundException('Ambulance not found');
    }

    const photo_url = ambulance.photo_url
      ? await this.s3Service.getSignedUrl(ambulance.photo_url)
      : null;

    return {
      id: ambulance.id,
      driver_id: ambulance.driver_id,
      ambulance_type_id: ambulance.ambulance_type_id,
      registration_number: ambulance.registration_number,
      vehicle_number: ambulance.vehicle_number,
      photo_url,
      insurance_expiry: this.formatInsuranceExpiry(ambulance.insurance_expiry),
      status: ambulance.status,
      suspend_reason: ambulance.suspend_reason,
      created_at: ambulance.created_at,
      updated_at: ambulance.updated_at,
      ambulance_type: ambulance.ambulance_type
        ? { id: ambulance.ambulance_type.id, name: ambulance.ambulance_type.name }
        : null,
      driver: ambulance.driver
        ? {
            id: ambulance.driver.id,
            name: ambulance.driver.name,
          }
        : null,
      equipment: (ambulance.equipment ?? []).map((e) => ({
        id: e.id,
        name: e.name,
      })),
    };
  }

  private formatInsuranceExpiry(
    value: Date | string | null | undefined,
  ): string | null {
    if (value == null) return null;
    if (typeof value === 'string') return value.split('T')[0];
    try {
      return (value as Date).toISOString().split('T')[0];
    } catch {
      return String(value).split('T')[0];
    }
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

  private async getAmbulanceOrThrow(id: string): Promise<Ambulance> {
    const ambulance = await this.ambulanceRepo.findOne({ where: { id } });
    if (!ambulance) {
      throw new NotFoundException('Ambulance not found');
    }
    return ambulance;
  }

  async approveAmbulance(
    ambulanceId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ambulance = await this.getAmbulanceOrThrow(ambulanceId);
    if (ambulance.status !== AmbulanceStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve ambulance with status: ${ambulance.status}`,
      );
    }

    await this.ambulanceRepo.update(ambulanceId, {
      status: AmbulanceStatus.APPROVED,
      suspend_reason: undefined,
    });
    await this.createAuditLog(adminId, 'APPROVE_AMBULANCE', 'ambulances', ambulanceId);

    return { message: 'Ambulance approved successfully' };
  }

  async suspendAmbulance(
    ambulanceId: string,
    adminId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const ambulance = await this.getAmbulanceOrThrow(ambulanceId);
    if (ambulance.status === AmbulanceStatus.SUSPENDED) {
      throw new BadRequestException('Ambulance is already suspended');
    }

    await this.ambulanceRepo.update(ambulanceId, {
      status: AmbulanceStatus.SUSPENDED,
      suspend_reason: reason ?? undefined,
    });
    await this.createAuditLog(
      adminId,
      'SUSPEND_AMBULANCE',
      'ambulances',
      ambulanceId,
      reason ? { reason } : undefined,
    );

    return { message: 'Ambulance suspended' };
  }

  async restoreAmbulance(
    ambulanceId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ambulance = await this.getAmbulanceOrThrow(ambulanceId);
    if (ambulance.status !== AmbulanceStatus.SUSPENDED) {
      throw new BadRequestException(
        `Cannot restore ambulance with status: ${ambulance.status}`,
      );
    }

    await this.ambulanceRepo.update(ambulanceId, {
      status: AmbulanceStatus.APPROVED,
      suspend_reason: undefined,
    });
    await this.createAuditLog(adminId, 'RESTORE_AMBULANCE', 'ambulances', ambulanceId);

    return { message: 'Ambulance restored successfully' };
  }
}
