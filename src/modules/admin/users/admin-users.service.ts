import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { S3Service } from '../../../shared/s3/s3.service';

export interface UserDetailResponse {
  id: string;
  mobile_number: string;
  name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  is_verified: boolean;
  is_blocked: boolean;
  role: string;
  created_at: Date;
  updated_at: Date;
  ride_history: RideHistoryItem[];
}

export interface RideHistoryItem {
  id: string;
  status: string;
  pickup_address?: string;
  drop_address?: string;
  created_at: Date;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    private readonly s3Service: S3Service,
  ) {}

  async listUsers(query: PaginationDto & UserListQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        '(user.name LIKE :term OR user.mobile_number LIKE :term OR user.email LIKE :term)',
        { term },
      );
    }

    if (status === 'blocked') {
      qb.andWhere('user.is_blocked = :is_blocked', { is_blocked: true });
    } else if (status === 'active') {
      qb.andWhere('user.is_blocked = :is_blocked', { is_blocked: false });
    }

    const [users, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      users.map(async (user) => {
        const profile_photo_url = user.profile_photo_url
          ? await this.s3Service.getSignedUrl(user.profile_photo_url)
          : null;
        return { ...user, profile_photo_url };
      }),
    );

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

  async getUserById(id: string): Promise<UserDetailResponse> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rideHistory = await this.fetchRideHistoryForUser(id);

    const profile_photo_url = user.profile_photo_url
      ? await this.s3Service.getSignedUrl(user.profile_photo_url)
      : null;

    return {
      id: user.id,
      mobile_number: user.mobile_number,
      name: user.name,
      email: user.email,
      profile_photo_url,
      is_verified: user.is_verified,
      is_blocked: user.is_blocked,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      ride_history: rideHistory,
    };
  }

  private async fetchRideHistoryForUser(
    _userId: string,
  ): Promise<RideHistoryItem[]> {
    // Phase 3: bookings table will provide ride history
    return [];
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

  async blockUser(id: string, adminId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.is_blocked) {
      throw new BadRequestException('User is already blocked');
    }

    await this.userRepo.update(id, { is_blocked: true });
    await this.createAuditLog(adminId, 'BLOCK_USER', 'users', id);

    return { message: 'User blocked successfully' };
  }

  async unblockUser(
    id: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.is_blocked) {
      throw new BadRequestException('User is not blocked');
    }

    await this.userRepo.update(id, { is_blocked: false });
    await this.createAuditLog(adminId, 'UNBLOCK_USER', 'users', id);

    return { message: 'User unblocked successfully' };
  }
}
