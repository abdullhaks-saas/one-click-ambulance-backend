import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification } from '../../../database/entities/notification.entity';
import {
  NotificationLog,
  NotificationRecipientType,
  NotificationDeliveryStatus,
} from '../../../database/entities/notification-log.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { User } from '../../../database/entities/user.entity';
import { NotifyDriversDto } from './dto/notify-drivers.dto';
import { NotifyUsersDto } from './dto/notify-users.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationHistoryQueryDto } from './dto/notification-history-query.dto';
import { FCM_NOTIFICATION_SERVICE } from '../../../shared/notifications/interfaces/fcm-notification.interface';
import type { IFcmNotificationService } from '../../../shared/notifications/interfaces/fcm-notification.interface';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(FCM_NOTIFICATION_SERVICE)
    private readonly fcmService: IFcmNotificationService,
  ) {}

  /** Maps stored campaign audience to admin-portal target labels (see Phase 6 notification history). */
  private audienceToTargetType(
    audience: string | null | undefined,
  ):
    | 'ALL_USERS'
    | 'ALL_DRIVERS'
    | 'SPECIFIC_USERS'
    | 'SPECIFIC_DRIVERS'
    | 'TEST'
    | 'UNKNOWN' {
    switch (audience) {
      case 'broadcast_users':
        return 'ALL_USERS';
      case 'broadcast_drivers':
        return 'ALL_DRIVERS';
      case 'targeted_users':
        return 'SPECIFIC_USERS';
      case 'targeted_drivers':
        return 'SPECIFIC_DRIVERS';
      case 'test':
        return 'TEST';
      default:
        return 'UNKNOWN';
    }
  }

  /** Merges admin `data` with optional `image_url` for persistence and FCM data payload. */
  private mergeNotificationPayloadData(
    data: Record<string, string> | undefined,
    imageUrl: string | undefined,
  ): Record<string, string> | null {
    const merged: Record<string, string> = { ...(data ?? {}) };
    if (imageUrl) merged.image_url = imageUrl;
    return Object.keys(merged).length ? merged : null;
  }

  private async sendAndLog(args: {
    notificationId: string | null;
    recipientType: NotificationRecipientType;
    recipientId: string | null;
    token: string | null;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }): Promise<void> {
    const log = this.logRepo.create({
      notification_id: args.notificationId,
      recipient_type: args.recipientType,
      recipient_id: args.recipientId,
      fcm_token: args.token,
      status: NotificationDeliveryStatus.FAILED,
      error_message: null,
    });
    if (!args.token) {
      log.error_message = 'No FCM token';
      await this.logRepo.save(log);
      return;
    }
    try {
      const ok = await this.fcmService.sendToToken(args.token, {
        title: args.title,
        body: args.body,
        data: args.data,
        imageUrl: args.imageUrl,
      });
      log.status = ok
        ? NotificationDeliveryStatus.SENT
        : NotificationDeliveryStatus.FAILED;
      if (!ok) log.error_message = 'FCM returned false';
    } catch (e: unknown) {
      log.status = NotificationDeliveryStatus.FAILED;
      log.error_message = e instanceof Error ? e.message : String(e);
    }
    await this.logRepo.save(log);
  }

  async notifyDrivers(dto: NotifyDriversDto, adminId: string) {
    const payloadData = this.mergeNotificationPayloadData(
      dto.data,
      dto.image_url,
    );
    const n = this.notificationRepo.create({
      title: dto.title,
      body: dto.body,
      data: payloadData,
      audience: 'targeted_drivers',
      created_by_admin_id: adminId,
    });
    const saved = await this.notificationRepo.save(n);
    const drivers = await this.driverRepo.find({
      where: { id: In(dto.driver_ids) },
    });
    const foundIds = new Set(drivers.map((d) => d.id));
    for (const id of dto.driver_ids) {
      if (!foundIds.has(id)) {
        await this.sendAndLog({
          notificationId: saved.id,
          recipientType: NotificationRecipientType.DRIVER,
          recipientId: id,
          token: null,
          title: dto.title,
          body: dto.body,
          data: payloadData ?? undefined,
          imageUrl: dto.image_url,
        });
      }
    }
    for (const d of drivers) {
      await this.sendAndLog({
        notificationId: saved.id,
        recipientType: NotificationRecipientType.DRIVER,
        recipientId: d.id,
        token: d.fcm_token,
        title: dto.title,
        body: dto.body,
        data: payloadData ?? undefined,
        imageUrl: dto.image_url,
      });
    }
    return {
      message: 'Notification queued',
      notification_id: saved.id,
    };
  }

  async notifyUsers(dto: NotifyUsersDto, adminId: string) {
    const payloadData = this.mergeNotificationPayloadData(
      dto.data,
      dto.image_url,
    );
    const n = this.notificationRepo.create({
      title: dto.title,
      body: dto.body,
      data: payloadData,
      audience: 'targeted_users',
      created_by_admin_id: adminId,
    });
    const saved = await this.notificationRepo.save(n);
    const users = await this.userRepo.find({
      where: { id: In(dto.user_ids) },
    });
    const foundIds = new Set(users.map((u) => u.id));
    for (const id of dto.user_ids) {
      if (!foundIds.has(id)) {
        await this.sendAndLog({
          notificationId: saved.id,
          recipientType: NotificationRecipientType.USER,
          recipientId: id,
          token: null,
          title: dto.title,
          body: dto.body,
          data: payloadData ?? undefined,
          imageUrl: dto.image_url,
        });
      }
    }
    for (const u of users) {
      await this.sendAndLog({
        notificationId: saved.id,
        recipientType: NotificationRecipientType.USER,
        recipientId: u.id,
        token: u.fcm_token,
        title: dto.title,
        body: dto.body,
        data: payloadData ?? undefined,
        imageUrl: dto.image_url,
      });
    }
    return {
      message: 'Notification queued',
      notification_id: saved.id,
    };
  }

  async broadcastUsers(dto: BroadcastNotificationDto, adminId: string) {
    const payloadData = this.mergeNotificationPayloadData(
      dto.data,
      dto.image_url,
    );
    const n = this.notificationRepo.create({
      title: dto.title,
      body: dto.body,
      data: payloadData,
      audience: 'broadcast_users',
      created_by_admin_id: adminId,
    });
    const saved = await this.notificationRepo.save(n);
    const users = await this.userRepo.find({
      where: {},
      select: ['id', 'fcm_token'],
    });
    for (const u of users) {
      await this.sendAndLog({
        notificationId: saved.id,
        recipientType: NotificationRecipientType.USER,
        recipientId: u.id,
        token: u.fcm_token,
        title: dto.title,
        body: dto.body,
        data: payloadData ?? undefined,
        imageUrl: dto.image_url,
      });
    }
    return {
      message: 'Broadcast to users queued',
      notification_id: saved.id,
      recipient_count: users.length,
    };
  }

  async broadcastDrivers(dto: BroadcastNotificationDto, adminId: string) {
    const payloadData = this.mergeNotificationPayloadData(
      dto.data,
      dto.image_url,
    );
    const n = this.notificationRepo.create({
      title: dto.title,
      body: dto.body,
      data: payloadData,
      audience: 'broadcast_drivers',
      created_by_admin_id: adminId,
    });
    const saved = await this.notificationRepo.save(n);
    const drivers = await this.driverRepo.find({
      where: {},
      select: ['id', 'fcm_token'],
    });
    for (const d of drivers) {
      await this.sendAndLog({
        notificationId: saved.id,
        recipientType: NotificationRecipientType.DRIVER,
        recipientId: d.id,
        token: d.fcm_token,
        title: dto.title,
        body: dto.body,
        data: payloadData ?? undefined,
        imageUrl: dto.image_url,
      });
    }
    return {
      message: 'Broadcast to drivers queued',
      notification_id: saved.id,
      recipient_count: drivers.length,
    };
  }

  private deriveCampaignStatus(
    recipientCount: number,
    sentCount: number,
    failedCount: number,
  ): 'SENT' | 'FAILED' | 'PARTIAL' | 'NONE' {
    if (recipientCount === 0) return 'NONE';
    if (sentCount === recipientCount) return 'SENT';
    if (failedCount === recipientCount) return 'FAILED';
    return 'PARTIAL';
  }

  /** One row per notification send (avoids N duplicate-looking rows for broadcasts). */
  private async adminHistoryCampaigns(query: NotificationHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const countQb = this.notificationRepo.createQueryBuilder('n');
    if (query.from) {
      countQb.andWhere('DATE(n.created_at) >= :from', { from: query.from });
    }
    if (query.to) {
      countQb.andWhere('DATE(n.created_at) <= :to', { to: query.to });
    }
    const total = await countQb.getCount();

    const listQb = this.notificationRepo.createQueryBuilder('n');
    if (query.from) {
      listQb.andWhere('DATE(n.created_at) >= :from', { from: query.from });
    }
    if (query.to) {
      listQb.andWhere('DATE(n.created_at) <= :to', { to: query.to });
    }
    listQb.orderBy('n.created_at', 'DESC').skip(skip).take(limit);
    const notifications = await listQb.getMany();

    const data = await Promise.all(
      notifications.map(async (n) => {
        const raw = await this.logRepo
          .createQueryBuilder('l')
          .select('COUNT(l.id)', 'total')
          .addSelect(
            `COALESCE(SUM(CASE WHEN l.status = :s THEN 1 ELSE 0 END), 0)`,
            'sent',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN l.status = :f THEN 1 ELSE 0 END), 0)`,
            'failed',
          )
          .where('l.notification_id = :nid', { nid: n.id })
          .setParameter('s', NotificationDeliveryStatus.SENT)
          .setParameter('f', NotificationDeliveryStatus.FAILED)
          .getRawOne<{ total: string; sent: string; failed: string }>();
        const recipient_count = Number(raw?.total ?? 0);
        const sent_count = Number(raw?.sent ?? 0);
        const failed_count = Number(raw?.failed ?? 0);
        return {
          id: n.id,
          notification_id: n.id,
          target_type: this.audienceToTargetType(n.audience),
          title: n.title,
          body: n.body,
          image_url: n.data?.image_url ?? null,
          created_at: n.created_at,
          recipient_count,
          sent_count,
          failed_count,
          status: this.deriveCampaignStatus(
            recipient_count,
            sent_count,
            failed_count,
          ),
        };
      }),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /** One row per delivery log (resend, per-recipient errors). */
  private async adminHistoryDeliveries(query: NotificationHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const { status, from, to, notification_id } = query;

    const qb = this.logRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.notification', 'n')
      .orderBy('l.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (notification_id) {
      qb.andWhere('l.notification_id = :nid', { nid: notification_id });
    }
    if (status === 'sent') {
      qb.andWhere('l.status = :st', { st: NotificationDeliveryStatus.SENT });
    } else if (status === 'failed') {
      qb.andWhere('l.status = :st', { st: NotificationDeliveryStatus.FAILED });
    }
    if (from) {
      qb.andWhere('DATE(l.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(l.created_at) <= :to', { to });
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((l) => ({
        id: l.id,
        notification_id: l.notification_id,
        target_type: this.audienceToTargetType(l.notification?.audience),
        title: l.notification?.title ?? null,
        body: l.notification?.body ?? null,
        recipient_type: l.recipient_type,
        recipient_id: l.recipient_id,
        status:
          l.status === NotificationDeliveryStatus.SENT ? 'SENT' : 'FAILED',
        error_message: l.error_message,
        created_at: l.created_at,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async adminHistory(query: NotificationHistoryQueryDto) {
    const mode = query.group_by ?? 'campaign';
    if (mode === 'delivery') {
      const inner = await this.adminHistoryDeliveries(query);
      return { group_by: 'delivery' as const, ...inner };
    }
    const inner = await this.adminHistoryCampaigns(query);
    return { group_by: 'campaign' as const, ...inner };
  }

  async resend(logId: string) {
    const log = await this.logRepo.findOne({
      where: { id: logId },
      relations: ['notification'],
    });
    if (!log) {
      throw new NotFoundException('Notification log not found');
    }
    if (log.status !== NotificationDeliveryStatus.FAILED) {
      throw new BadRequestException('Only failed deliveries can be resent');
    }
    if (!log.fcm_token) {
      throw new BadRequestException('Log has no FCM token');
    }
    const title = log.notification?.title ?? 'Notification';
    const body = log.notification?.body ?? '';
    const data = log.notification?.data ?? undefined;
    const imageUrl = data?.image_url;
    try {
      const ok = await this.fcmService.sendToToken(log.fcm_token, {
        title,
        body,
        data: data ?? undefined,
        imageUrl,
      });
      log.status = ok
        ? NotificationDeliveryStatus.SENT
        : NotificationDeliveryStatus.FAILED;
      log.error_message = ok ? null : 'FCM returned false';
    } catch (e: unknown) {
      log.error_message = e instanceof Error ? e.message : String(e);
      log.status = NotificationDeliveryStatus.FAILED;
    }
    await this.logRepo.save(log);
    return { message: 'Resend attempted', status: log.status };
  }

  async testPush(token: string, title: string, body: string, adminId: string) {
    const n = this.notificationRepo.create({
      title,
      body,
      data: null,
      audience: 'test',
      created_by_admin_id: adminId,
    });
    const saved = await this.notificationRepo.save(n);
    await this.sendAndLog({
      notificationId: saved.id,
      recipientType: NotificationRecipientType.USER,
      recipientId: null,
      token,
      title,
      body,
    });
    return { message: 'Test push sent (check notification_logs)' };
  }
}
