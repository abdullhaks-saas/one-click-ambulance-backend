import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { DriverStatus } from '../../../database/entities/driver.entity';

@Injectable()
export class AdminDashboardService {
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
}
