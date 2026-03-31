import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../../database/entities/notification.entity';
import { NotificationLog } from '../../../database/entities/notification-log.entity';
import { UserNotificationsController } from './user-notifications.controller';
import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationLog])],
  controllers: [UserNotificationsController],
  providers: [UserNotificationsService],
})
export class UserNotificationsModule {}
