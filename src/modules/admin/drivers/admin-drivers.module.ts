import { Module } from '@nestjs/common';
import { AdminDriversController } from './admin-drivers.controller';
import { AdminDriverActionsController } from './admin-driver-actions.controller';
import { AdminDriversService } from './admin-drivers.service';
import { DatabaseModule } from '../../../database/database.module';
import { FcmNoopService } from '../../../shared/notifications/fcm-noop.service';
import { FCM_NOTIFICATION_SERVICE } from '../../../shared/notifications/interfaces/fcm-notification.interface';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDriversController, AdminDriverActionsController],
  providers: [
    AdminDriversService,
    {
      provide: FCM_NOTIFICATION_SERVICE,
      useClass: FcmNoopService,
    },
  ],
  exports: [AdminDriversService],
})
export class AdminDriversModule {}
