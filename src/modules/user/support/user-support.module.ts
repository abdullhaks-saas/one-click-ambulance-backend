import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicket } from '../../../database/entities/support-ticket.entity';
import { TicketMessage } from '../../../database/entities/ticket-message.entity';
import { UserSupportController } from './user-support.controller';
import { UserSupportService } from './user-support.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, TicketMessage])],
  controllers: [UserSupportController],
  providers: [UserSupportService],
})
export class UserSupportModule {}
