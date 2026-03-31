import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../../database/entities/support-ticket.entity';
import { TicketMessage } from '../../../database/entities/ticket-message.entity';
import { CreateUserTicketDto } from './dto/create-user-ticket.dto';
import { UserSupportMessageDto } from './dto/user-support-message.dto';
import { UserTicketsQueryDto } from './dto/user-tickets.query.dto';

@Injectable()
export class UserSupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
  ) {}

  async createTicket(userId: string, dto: CreateUserTicketDto) {
    const ticket = await this.ticketRepo.save(
      this.ticketRepo.create({
        user_id: userId,
        subject: dto.subject.trim(),
        status: SupportTicketStatus.OPEN,
      }),
    );
    await this.messageRepo.save(
      this.messageRepo.create({
        ticket_id: ticket.id,
        admin_id: null,
        body: dto.description.trim(),
        is_from_admin: false,
      }),
    );
    return { id: ticket.id, subject: ticket.subject, status: ticket.status };
  }

  async listTickets(userId: string, query: UserTicketsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.user_id = :uid', { uid: userId })
      .orderBy('t.updated_at', 'DESC')
      .skip(skip)
      .take(limit);
    if (query.status) {
      qb.andWhere('t.status = :st', { st: query.status });
    }
    const [data, total] = await qb.getManyAndCount();
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

  async getTicket(userId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId },
      relations: ['messages'],
    });
    if (!ticket || ticket.user_id !== userId) {
      throw new NotFoundException('Ticket not found');
    }
    ticket.messages = [...(ticket.messages ?? [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return ticket;
  }

  async appendMessage(userId: string, dto: UserSupportMessageDto) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: dto.ticket_id },
    });
    if (!ticket || ticket.user_id !== userId) {
      throw new ForbiddenException('Ticket not found or access denied');
    }
    if (ticket.status === SupportTicketStatus.CLOSED) {
      throw new ForbiddenException('Ticket is closed');
    }
    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        ticket_id: dto.ticket_id,
        admin_id: null,
        body: dto.message.trim(),
        is_from_admin: false,
      }),
    );
    await this.ticketRepo.save(ticket);
    return msg;
  }
}
