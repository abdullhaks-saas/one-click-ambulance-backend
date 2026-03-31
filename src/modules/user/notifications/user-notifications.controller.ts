import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserNotificationsService } from './user-notifications.service';
import { UserNotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationsReadDto } from './dto/notifications-read.dto';

@ApiTags('User — Notifications')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('notifications')
export class UserNotificationsController {
  constructor(private readonly notificationsService: UserNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'In-app / push delivery records for this user (Phase K)' })
  list(
    @CurrentUser() auth: JwtPayload,
    @Query() query: UserNotificationsQueryDto,
  ) {
    return this.notificationsService.list(auth.sub, query);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notification log rows as read' })
  markRead(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: NotificationsReadDto,
  ) {
    return this.notificationsService.markRead(auth.sub, dto);
  }
}
