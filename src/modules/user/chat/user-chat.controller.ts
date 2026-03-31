import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserChatService } from './user-chat.service';
import { SendChatDto } from './dto/send-chat.dto';
import { ChatMessagesQueryDto } from './dto/chat-messages.query.dto';

@ApiTags('User — Chat')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('chat')
export class UserChatController {
  constructor(private readonly chatService: UserChatService) {}

  @Post('send')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Send in-booking message as passenger (Phase L)' })
  send(@CurrentUser() auth: JwtPayload, @Body() dto: SendChatDto) {
    return this.chatService.send(auth.sub, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List chat thread for a booking' })
  messages(
    @CurrentUser() auth: JwtPayload,
    @Query() query: ChatMessagesQueryDto,
  ) {
    return this.chatService.messages(query.booking_id, auth.sub);
  }
}
