import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RideRating } from '../../../database/entities/ride-rating.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { RatingsQueryDto } from './dto/ratings-query.dto';

@Injectable()
export class AdminRatingsService {
  constructor(
    @InjectRepository(RideRating)
    private readonly ratingRepo: Repository<RideRating>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
  ) {}

  async listRatings(query: RatingsQueryDto) {
    const {
      page = 1,
      limit = 20,
      driver_id,
      max_rating,
      min_rating,
      from,
      to,
    } = query;

    const qb = this.ratingRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'user')
      .leftJoinAndSelect('r.driver', 'driver')
      .leftJoinAndSelect('r.booking', 'booking');

    if (driver_id) {
      qb.andWhere('r.driver_id = :driver_id', { driver_id });
    }

    if (max_rating) {
      qb.andWhere('r.rating <= :max_rating', { max_rating });
    }

    if (min_rating) {
      qb.andWhere('r.rating >= :min_rating', { min_rating });
    }

    if (from) {
      qb.andWhere('r.created_at >= :from', { from: new Date(from) });
    }

    if (to) {
      qb.andWhere('r.created_at <= :to', { to: new Date(to) });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items.map((r) => ({
        id: r.id,
        booking_id: r.booking_id,
        user_id: r.user_id,
        user_name: r.user?.name ?? null,
        user_mobile: r.user?.mobile_number ?? null,
        driver_id: r.driver_id,
        driver_name: r.driver?.name ?? null,
        driver_mobile: r.driver?.mobile_number ?? null,
        rating: r.rating,
        review: r.review,
        created_at: r.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const totalRatings = await this.ratingRepo.count();

    const avgResult = await this.ratingRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .getRawOne();

    const lowRatedDrivers = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.driver_id', 'driver_id')
      .addSelect('AVG(r.rating)', 'avg_rating')
      .addSelect('COUNT(*)', 'review_count')
      .groupBy('r.driver_id')
      .having('AVG(r.rating) <= :threshold', { threshold: 3 })
      .orderBy('avg_rating', 'ASC')
      .limit(20)
      .getRawMany();

    const driverIds = lowRatedDrivers.map((d) => d.driver_id);
    const drivers =
      driverIds.length > 0
        ? await this.driverRepo
            .createQueryBuilder('d')
            .where('d.id IN (:...ids)', { ids: driverIds })
            .getMany()
        : [];

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const distribution = await this.ratingRepo
      .createQueryBuilder('r')
      .select('r.rating', 'stars')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.rating')
      .orderBy('r.rating', 'ASC')
      .getRawMany();

    return {
      total_ratings: totalRatings,
      average_rating: Number(avgResult?.avg ?? 0).toFixed(2),
      distribution: distribution.map((d) => ({
        stars: Number(d.stars),
        count: Number(d.count),
      })),
      low_rated_drivers: lowRatedDrivers.map((d) => ({
        driver_id: d.driver_id,
        driver_name: driverMap.get(d.driver_id)?.name ?? null,
        avg_rating: Number(Number(d.avg_rating).toFixed(2)),
        review_count: Number(d.review_count),
      })),
    };
  }
}
