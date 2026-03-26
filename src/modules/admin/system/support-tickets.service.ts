import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../../database/entities/support-ticket.entity';
import { TicketMessage } from '../../../database/entities/ticket-message.entity';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';

@Injectable()
export class SupportTicketsService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
    @InjectRepository(TicketMessage)
    private readonly messageRepo: Repository<TicketMessage>,
  ) {}

  async list(query: SupportTicketQueryDto) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .orderBy('t.updated_at', 'DESC')
      .skip(skip)
      .take(limit);
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
    if (search?.trim()) {
      qb.andWhere('t.subject LIKE :sub', { sub: `%${search.trim()}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id },
      relations: ['messages'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.messages = [...(ticket.messages ?? [])].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return ticket;
  }

  async addAdminMessage(ticketId: string, adminId: string, body: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const msg = this.messageRepo.create({
      ticket_id: ticketId,
      admin_id: adminId,
      body,
      is_from_admin: true,
    });
    await this.messageRepo.save(msg);
    if (ticket.status === SupportTicketStatus.CLOSED) {
      ticket.status = SupportTicketStatus.OPEN;
    } else if (ticket.status === SupportTicketStatus.OPEN) {
      ticket.status = SupportTicketStatus.IN_PROGRESS;
    }
    await this.ticketRepo.save(ticket);
    return msg;
  }

  async updateStatus(id: string, status: 'open' | 'in_progress' | 'closed') {
    const ticket = await this.ticketRepo.findOne({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.status = status as SupportTicketStatus;
    await this.ticketRepo.save(ticket);
    return { message: 'Ticket status updated', status: ticket.status };
  }
}
