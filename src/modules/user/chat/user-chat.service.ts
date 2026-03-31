import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { Chat } from '../../../database/entities/chat.entity';
import { CallLog } from '../../../database/entities/call-log.entity';
import { SendChatDto } from './dto/send-chat.dto';
import { LogCallDto } from './dto/log-call.dto';

@Injectable()
export class UserChatService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
    @InjectRepository(CallLog)
    private readonly callLogRepo: Repository<CallLog>,
  ) {}

  private async assertBookingParticipant(
    bookingId: string,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, user_id: userId },
    });
    if (!booking) {
      throw new ForbiddenException('Not a participant of this booking');
    }
    return booking;
  }

  async send(userId: string, dto: SendChatDto) {
    await this.assertBookingParticipant(dto.booking_id, userId);
    const row = await this.chatRepo.save(
      this.chatRepo.create({
        booking_id: dto.booking_id,
        sender_type: 'user',
        message: dto.message.trim(),
      }),
    );
    return {
      id: row.id,
      booking_id: row.booking_id,
      sender_type: row.sender_type,
      message: row.message,
      created_at: row.created_at,
    };
  }

  async messages(bookingId: string, userId: string) {
    await this.assertBookingParticipant(bookingId, userId);
    const rows = await this.chatRepo.find({
      where: { booking_id: bookingId },
      order: { created_at: 'ASC' },
      take: 500,
    });
    return {
      booking_id: bookingId,
      messages: rows.map((m) => ({
        id: m.id,
        sender_type: m.sender_type,
        message: m.message,
        created_at: m.created_at,
      })),
    };
  }

  async logCall(userId: string, dto: LogCallDto) {
    await this.assertBookingParticipant(dto.booking_id, userId);
    const row = await this.callLogRepo.save(
      this.callLogRepo.create({
        booking_id: dto.booking_id,
        caller: dto.caller,
        receiver: dto.receiver,
        call_duration: dto.call_duration ?? null,
      }),
    );
    return { id: row.id, created_at: row.created_at };
  }
}
