import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdminAlert,
  AdminAlertType,
  AdminAlertSeverity,
} from '../../../database/entities/admin-alert.entity';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { Driver } from '../../../database/entities/driver.entity';
import { Zone } from '../../../database/entities/zone.entity';

@Injectable()
export class AdminAlertsService {
  constructor(
    @InjectRepository(AdminAlert)
    private readonly alertRepo: Repository<AdminAlert>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
  ) {}

  async listAlerts(query: AlertsQueryDto) {
    const { page = 1, limit = 20, type, severity, unread_only } = query;

    const qb = this.alertRepo
      .createQueryBuilder('a')
      .where('a.is_dismissed = :dismissed', { dismissed: false });

    if (type) {
      qb.andWhere('a.type = :type', { type });
    }
    if (severity) {
      qb.andWhere('a.severity = :severity', { severity });
    }
    if (unread_only) {
      qb.andWhere('a.is_read = :read', { read: false });
    }

    qb.orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const count = await this.alertRepo.count({
      where: { is_read: false, is_dismissed: false },
    });
    return { count };
  }

  async markAsRead(id: string) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.is_read = true;
    await this.alertRepo.save(alert);
    return { message: 'Alert marked as read' };
  }

  async markAllAsRead() {
    await this.alertRepo.update(
      { is_read: false, is_dismissed: false },
      { is_read: true },
    );
    return { message: 'All alerts marked as read' };
  }

  async dismissAlert(id: string) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    alert.is_dismissed = true;
    await this.alertRepo.save(alert);
    return { message: 'Alert dismissed' };
  }

  async checkAndCreateAlerts(): Promise<void> {
    const onlineDrivers = await this.driverRepo.count({
      where: { is_online: true },
    });

    if (onlineDrivers < 3) {
      await this.createAlert(
        AdminAlertType.LOW_AVAILABILITY,
        AdminAlertSeverity.WARNING,
        'Low ambulance availability',
        `Only ${onlineDrivers} driver(s) currently online. Service availability may be impacted.`,
        { online_count: onlineDrivers },
      );
    }
  }

  private async createAlert(
    type: AdminAlertType,
    severity: AdminAlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<AdminAlert> {
    const recent = await this.alertRepo.findOne({
      where: { type, title, is_dismissed: false },
      order: { created_at: 'DESC' },
    });

    if (recent) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (recent.created_at > hourAgo) return recent;
    }

    const alert = this.alertRepo.create({
      type,
      severity,
      title,
      message,
      metadata,
    });
    return this.alertRepo.save(alert);
  }
}
