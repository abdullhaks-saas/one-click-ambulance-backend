import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../../database/entities/driver.entity';
import { DriverStatus } from '../../../database/entities/driver.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class AdminDriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
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
}
