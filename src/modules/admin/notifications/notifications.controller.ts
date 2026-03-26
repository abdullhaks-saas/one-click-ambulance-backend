import {
  Body,
  Controller,
  Get,
  Post,
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
import { AdminNotificationsService } from './admin-notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { NotificationHistoryQueryDto } from './dto/notification-history-query.dto';
import { ResendNotificationDto } from './dto/resend-notification.dto';
import { TestPushDto } from './dto/test-push.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
  ) {}

  @Post('broadcast-users')
  @ApiOperation({ summary: 'Phase 6: Broadcast to all users with FCM token' })
  broadcastUsers(@Body() dto: BroadcastNotificationDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.notificationsService.broadcastUsers(dto, adminId);
  }

  @Post('broadcast-drivers')
  @ApiOperation({ summary: 'Phase 6: Broadcast to all drivers with FCM token' })
  broadcastDrivers(@Body() dto: BroadcastNotificationDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.notificationsService.broadcastDrivers(dto, adminId);
  }

  @Get('admin-history')
  @ApiOperation({ summary: 'Phase 6: Notification send history' })
  adminHistory(@Query() query: NotificationHistoryQueryDto) {
    return this.notificationsService.adminHistory(query);
  }

  @Post('resend')
  @ApiOperation({ summary: 'Phase 6: Retry a failed notification delivery' })
  resend(@Body() dto: ResendNotificationDto) {
    return this.notificationsService.resend(dto.log_id);
  }

  @Post('test')
  @ApiOperation({ summary: 'Phase 6: Test push to one device token' })
  test(@Body() dto: TestPushDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.notificationsService.testPush(
      dto.token,
      dto.title ?? 'Test notification',
      dto.body ?? 'Admin test push',
      adminId,
    );
  }
}
