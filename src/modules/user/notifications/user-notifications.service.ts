import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  NotificationLog,
  NotificationRecipientType,
} from '../../../database/entities/notification-log.entity';
import { UserNotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationsReadDto } from './dto/notifications-read.dto';

@Injectable()
export class UserNotificationsService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
  ) {}

  async list(userId: string, query: UserNotificationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.notification', 'n')
      .where('l.recipient_type = :rt', { rt: NotificationRecipientType.USER })
      .andWhere('l.recipient_id = :uid', { uid: userId })
      .orderBy('l.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((l) => ({
        id: l.id,
        title: l.notification?.title ?? '(notification)',
        body: l.notification?.body ?? '',
        data: l.notification?.data ?? null,
        status: l.status,
        read_at: l.read_at,
        created_at: l.created_at,
        notification_id: l.notification_id,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async markRead(userId: string, dto: NotificationsReadDto) {
    const logs = await this.logRepo.find({
      where: {
        id: In(dto.notification_log_ids),
        recipient_id: userId,
        recipient_type: NotificationRecipientType.USER,
      },
    });
    if (logs.length === 0) {
      throw new NotFoundException('No matching notifications for this user');
    }
    const now = new Date();
    for (const l of logs) {
      l.read_at = now;
    }
    await this.logRepo.save(logs);
    return { updated: logs.length };
  }
}
