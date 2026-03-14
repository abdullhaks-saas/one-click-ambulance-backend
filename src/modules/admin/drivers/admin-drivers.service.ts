import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../../database/entities/driver.entity';
import { DriverStatus } from '../../../database/entities/driver.entity';
import {
  DriverDocument,
  VerificationStatus,
} from '../../../database/entities/driver-document.entity';
import { DriverBankAccount } from '../../../database/entities/driver-bank-account.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { FCM_NOTIFICATION_SERVICE } from '../../../shared/notifications/interfaces/fcm-notification.interface';
import { FcmNoopService } from '../../../shared/notifications/fcm-noop.service';

export interface DriverDetailResponse {
  id: string;
  mobile_number: string;
  name: string | null;
  email: string | null;
  profile_photo: string | null;
  status: DriverStatus;
  rating: number;
  total_rides: number;
  is_verified: boolean;
  is_online: boolean;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
  documents: DriverDocumentResponse[];
  bank_accounts: DriverBankAccountResponse[];
}

export interface DriverDocumentResponse {
  id: string;
  document_type: string;
  document_url: string;
  verification_status: string;
  created_at: Date;
}

export interface DriverBankAccountResponse {
  id: string;
  bank_name: string;
  account_holder_name: string | null;
  ifsc_code: string;
  created_at: Date;
}

export interface AuditContext {
  adminId: string;
  ipAddress?: string;
}

@Injectable()
export class AdminDriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(DriverDocument)
    private readonly driverDocumentRepo: Repository<DriverDocument>,
    @InjectRepository(DriverBankAccount)
    private readonly driverBankAccountRepo: Repository<DriverBankAccount>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(FCM_NOTIFICATION_SERVICE)
    private readonly fcmService: FcmNoopService,
  ) {}

  async listDrivers(query: PaginationDto & { status?: DriverStatus }) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [drivers, total] = await this.driverRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: drivers,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverById(id: string): Promise<DriverDetailResponse> {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const [documents, bankAccounts] = await this.fetchDriverDocumentsAndBankAccounts(id);

    return {
      id: driver.id,
      mobile_number: driver.mobile_number,
      name: driver.name,
      email: driver.email,
      profile_photo: driver.profile_photo ?? null,
      status: driver.status,
      rating: Number(driver.rating),
      total_rides: driver.total_rides,
      is_verified: driver.is_verified,
      is_online: driver.is_online,
      is_blocked: driver.is_blocked,
      created_at: driver.created_at,
      updated_at: driver.updated_at,
      documents: documents.map((d) => ({
        id: d.id,
        document_type: d.document_type,
        document_url: d.document_url,
        verification_status: d.verification_status,
        created_at: d.created_at,
      })),
      bank_accounts: bankAccounts.map((b) => ({
        id: b.id,
        bank_name: b.bank_name,
        account_holder_name: b.account_holder_name,
        ifsc_code: b.ifsc_code,
        created_at: b.created_at,
      })),
    };
  }

  /**
   * Fetches driver documents and bank accounts.
   * Returns empty arrays if tables don't exist yet (e.g. before migration).
   */
  private async fetchDriverDocumentsAndBankAccounts(
    driverId: string,
  ): Promise<[DriverDocument[], DriverBankAccount[]]> {
    try {
      const [documents, bankAccounts] = await Promise.all([
        this.driverDocumentRepo.find({
          where: { driver_id: driverId },
          order: { created_at: 'DESC' },
        }),
        this.driverBankAccountRepo.find({
          where: { driver_id: driverId },
          order: { created_at: 'DESC' },
        }),
      ]);
      return [documents, bankAccounts];
    } catch {
      return [[], []];
    }
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    const audit = this.auditLogRepo.create({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? undefined,
      ip_address: ipAddress,
    });
    await this.auditLogRepo.save(audit);
  }

  private async getDriverOrThrow(id: string): Promise<Driver> {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }
    return driver;
  }

  async approveDriver(
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ctx: AuditContext = { adminId };
    const driver = await this.getDriverOrThrow(driverId);
    if (driver.status !== DriverStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve driver with status: ${driver.status}`,
      );
    }

    await this.driverRepo.update(driverId, { status: DriverStatus.APPROVED });
    await this.createAuditLog(
      ctx.adminId,
      'APPROVE_DRIVER',
      'drivers',
      driverId,
      undefined,
      ctx.ipAddress,
    );

    if (driver.fcm_token) {
      await this.fcmService.sendToToken(driver.fcm_token, {
        title: 'Registration Approved',
        body: 'Your driver registration has been approved. You can now go online.',
        data: { type: 'driver_approved' },
      });
    }

    return { message: 'Driver approved successfully' };
  }

  async rejectDriver(
    driverId: string,
    adminId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const ctx: AuditContext = { adminId };
    const driver = await this.getDriverOrThrow(driverId);
    if (driver.status !== DriverStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject driver with status: ${driver.status}`,
      );
    }

    await this.driverRepo.update(driverId, { status: DriverStatus.REJECTED });
    await this.createAuditLog(
      ctx.adminId,
      'REJECT_DRIVER',
      'drivers',
      driverId,
      reason ? { reason } : undefined,
      ctx.ipAddress,
    );

    return { message: 'Driver rejected' };
  }

  async suspendDriver(
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ctx: AuditContext = { adminId };
    const driver = await this.getDriverOrThrow(driverId);
    if (driver.status === DriverStatus.SUSPENDED) {
      throw new BadRequestException('Driver is already suspended');
    }
    if (driver.status === DriverStatus.BLOCKED) {
      throw new BadRequestException('Cannot suspend a blocked driver');
    }

    await this.driverRepo.update(driverId, { status: DriverStatus.SUSPENDED });
    await this.createAuditLog(
      ctx.adminId,
      'SUSPEND_DRIVER',
      'drivers',
      driverId,
      undefined,
      ctx.ipAddress,
    );

    return { message: 'Driver suspended' };
  }

  async blockDriver(
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ctx: AuditContext = { adminId };
    const driver = await this.getDriverOrThrow(driverId);
    if (driver.is_blocked) {
      throw new BadRequestException('Driver is already blocked');
    }

    await this.driverRepo.update(driverId, {
      status: DriverStatus.BLOCKED,
      is_blocked: true,
    });
    await this.createAuditLog(
      ctx.adminId,
      'BLOCK_DRIVER',
      'drivers',
      driverId,
      undefined,
      ctx.ipAddress,
    );

    return { message: 'Driver blocked' };
  }

  async unblockDriver(
    driverId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const ctx: AuditContext = { adminId };
    const driver = await this.getDriverOrThrow(driverId);
    if (!driver.is_blocked) {
      throw new BadRequestException('Driver is not blocked');
    }

    await this.driverRepo.update(driverId, {
      status: DriverStatus.APPROVED,
      is_blocked: false,
    });
    await this.createAuditLog(
      ctx.adminId,
      'UNBLOCK_DRIVER',
      'drivers',
      driverId,
      undefined,
      ctx.ipAddress,
    );

    return { message: 'Driver unblocked' };
  }

  async verifyDocument(
    documentId: string,
    status: VerificationStatus,
    adminId: string,
  ): Promise<{ message: string }> {
    if (status === VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Cannot set document status to pending. Use verified or rejected.',
      );
    }

    const doc = await this.driverDocumentRepo.findOne({
      where: { id: documentId },
      relations: ['driver'],
    });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.driverDocumentRepo.update(documentId, {
      verification_status: status,
    });

    await this.createAuditLog(
      adminId,
      status === VerificationStatus.VERIFIED
        ? 'VERIFY_DRIVER_DOCUMENT'
        : 'REJECT_DRIVER_DOCUMENT',
      'driver_documents',
      documentId,
      { driver_id: doc.driver_id, document_type: doc.document_type },
    );

    return {
      message:
        status === VerificationStatus.VERIFIED
          ? 'Document verified'
          : 'Document rejected',
    };
  }
}
