import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketQueryDto } from './dto/support-ticket-query.dto';
import { SupportMessageDto } from './dto/support-message.dto';
import { SupportTicketStatusDto } from './dto/support-ticket-status.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — Support tickets (Phase 10.3)')
@Controller('support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class SupportController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Phase 10.3: List support tickets' })
  list(@Query() query: SupportTicketQueryDto) {
    return this.supportTicketsService.list(query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Phase 10.3: Ticket with messages' })
  getOne(@Param('id') id: string) {
    return this.supportTicketsService.getById(id);
  }

  @Post('message')
  @ApiOperation({ summary: 'Phase 10.3: Admin reply' })
  reply(@Body() dto: SupportMessageDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.supportTicketsService.addAdminMessage(
      dto.ticket_id,
      adminId,
      dto.body,
    );
  }

  @Put('tickets/:id/status')
  @ApiOperation({ summary: 'Phase 10.3: Update ticket status' })
  status(@Param('id') id: string, @Body() dto: SupportTicketStatusDto) {
    return this.supportTicketsService.updateStatus(id, dto.status);
  }
}
