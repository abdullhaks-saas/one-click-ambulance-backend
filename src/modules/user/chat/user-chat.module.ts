import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { CallLog } from '../../../database/entities/call-log.entity';
import { UserChatController } from './user-chat.controller';
import { UserCallLogController } from './user-call.controller';
import { UserChatService } from './user-chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Chat, CallLog])],
  controllers: [UserChatController, UserCallLogController],
  providers: [UserChatService],
})
export class UserChatModule {}
