import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserChatService } from './user-chat.service';
import { LogCallDto } from './dto/log-call.dto';

@ApiTags('User — Chat')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('call')
export class UserCallLogController {
  constructor(private readonly chatService: UserChatService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log click-to-call for analytics (Phase L)' })
  log(@CurrentUser() auth: JwtPayload, @Body() dto: LogCallDto) {
    return this.chatService.logCall(auth.sub, dto);
  }
}
