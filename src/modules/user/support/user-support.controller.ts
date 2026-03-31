import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserSupportService } from './user-support.service';
import { CreateUserTicketDto } from './dto/create-user-ticket.dto';
import { UserSupportMessageDto } from './dto/user-support-message.dto';
import { UserTicketsQueryDto } from './dto/user-tickets.query.dto';

/**
 * Prefixed `user/support` to avoid route clashes with admin `support/*`.
 */
@ApiTags('User — Support')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('user/support')
export class UserSupportController {
  constructor(private readonly supportService: UserSupportService) {}

  @Post('ticket/create')
  @ApiOperation({ summary: 'Create support ticket (Phase N)' })
  create(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: CreateUserTicketDto,
  ) {
    return this.supportService.createTicket(auth.sub, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List your support tickets' })
  list(
    @CurrentUser() auth: JwtPayload,
    @Query() query: UserTicketsQueryDto,
  ) {
    return this.supportService.listTickets(auth.sub, query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Ticket with message thread' })
  getOne(
    @CurrentUser() auth: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.supportService.getTicket(auth.sub, id);
  }

  @Post('message')
  @ApiOperation({ summary: 'Reply on your ticket' })
  message(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: UserSupportMessageDto,
  ) {
    return this.supportService.appendMessage(auth.sub, dto);
  }
}
