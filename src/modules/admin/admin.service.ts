import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Driver } from '../../database/entities/driver.entity';
import { DriverStatus } from '../../database/entities/driver.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  async getDashboardMetrics() {
    const [userCount, driverCount, approvedDrivers, onlineDrivers] =
      await Promise.all([
        this.userRepo.count(),
        this.driverRepo.count(),
        this.driverRepo.count({
          where: { status: DriverStatus.APPROVED },
        }),
        this.driverRepo.count({
          where: { is_online: true },
        }),
      ]);

    return {
      rides_today: 0,
      active_rides: 0,
      completed_today: 0,
      revenue_today: 0,
      total_users: userCount,
      total_drivers: driverCount,
      approved_drivers: approvedDrivers,
      active_drivers: onlineDrivers,
    };
  }

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

  async listUsers(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async approveDriver(id: string) {
    await this.driverRepo.update(id, { status: DriverStatus.APPROVED });
    return { message: 'Driver approved successfully' };
  }

  async rejectDriver(id: string) {
    await this.driverRepo.update(id, { status: DriverStatus.REJECTED });
    return { message: 'Driver rejected' };
  }

  async suspendDriver(id: string) {
    await this.driverRepo.update(id, { status: DriverStatus.SUSPENDED });
    return { message: 'Driver suspended' };
  }

  async blockDriver(id: string) {
    await this.driverRepo.update(id, {
      status: DriverStatus.BLOCKED,
      is_blocked: true,
    });
    return { message: 'Driver blocked' };
  }

  async unblockDriver(id: string) {
    await this.driverRepo.update(id, {
      status: DriverStatus.APPROVED,
      is_blocked: false,
    });
    return { message: 'Driver unblocked' };
  }

  async blockUser(id: string) {
    await this.userRepo.update(id, { is_blocked: true });
    return { message: 'User blocked' };
  }

  async unblockUser(id: string) {
    await this.userRepo.update(id, { is_blocked: false });
    return { message: 'User unblocked' };
  }
}
