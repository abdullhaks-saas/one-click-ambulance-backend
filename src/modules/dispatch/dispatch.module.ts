import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DatabaseModule } from '../../database/database.module';
import { FcmNoopService } from '../../shared/notifications/fcm-noop.service';
import { FCM_NOTIFICATION_SERVICE } from '../../shared/notifications/interfaces/fcm-notification.interface';

@Module({
  imports: [DatabaseModule],
  controllers: [DispatchController],
  providers: [
    DispatchService,
    {
      provide: FCM_NOTIFICATION_SERVICE,
      useClass: FcmNoopService,
    },
  ],
  exports: [DispatchService],
})
export class DispatchModule {}
