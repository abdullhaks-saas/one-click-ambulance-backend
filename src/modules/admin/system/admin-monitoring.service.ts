import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from '../../../database/entities/error-log.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { LogsQueryDto } from './dto/logs-query.dto';

@Injectable()
export class AdminMonitoringService {
  constructor(
    @InjectRepository(ErrorLog)
    private readonly errorLogRepo: Repository<ErrorLog>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async listErrorLogs(query: LogsQueryDto) {
    const { page = 1, limit = 20, from, to, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.errorLogRepo
      .createQueryBuilder('e')
      .orderBy('e.created_at', 'DESC')
      .skip(skip)
      .take(limit);
    if (from) qb.andWhere('DATE(e.created_at) >= :from', { from });
    if (to) qb.andWhere('DATE(e.created_at) <= :to', { to });
    if (search) {
      qb.andWhere('(e.message LIKE :s OR e.path LIKE :s)', {
        s: `%${search}%`,
      });
    }
    const [data, total] = await qb.getManyAndCount();
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

  async listAuditLogs(query: LogsQueryDto) {
    const { page = 1, limit = 20, from, to, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.auditLogRepo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .skip(skip)
      .take(limit);
    if (from) qb.andWhere('DATE(a.created_at) >= :from', { from });
    if (to) qb.andWhere('DATE(a.created_at) <= :to', { to });
    if (search) {
      qb.andWhere(
        '(a.action LIKE :s OR a.entity_type LIKE :s OR a.entity_id LIKE :s)',
        { s: `%${search}%` },
      );
    }
    const [data, total] = await qb.getManyAndCount();
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
}
