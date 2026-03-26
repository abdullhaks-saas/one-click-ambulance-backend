import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { FcmNoopService } from '../../../shared/notifications/fcm-noop.service';
import { FCM_NOTIFICATION_SERVICE } from '../../../shared/notifications/interfaces/fcm-notification.interface';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotifyController } from './admin-notify.controller';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminNotifyController, NotificationsController],
  providers: [
    AdminNotificationsService,
    {
      provide: FCM_NOTIFICATION_SERVICE,
      useClass: FcmNoopService,
    },
  ],
})
export class AdminNotificationsModule {}
