import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminNotificationsService } from './admin-notifications.service';
import { NotifyDriversDto } from './dto/notify-drivers.dto';
import { NotifyUsersDto } from './dto/notify-users.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — Notifications')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminNotifyController {
  constructor(
    private readonly notificationsService: AdminNotificationsService,
  ) {}

  @Post('notify-drivers')
  @ApiOperation({ summary: 'Phase 6: Push notification to specific drivers' })
  notifyDrivers(@Body() dto: NotifyDriversDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.notificationsService.notifyDrivers(dto, adminId);
  }

  @Post('notify-users')
  @ApiOperation({ summary: 'Phase 6: Push notification to specific users' })
  notifyUsers(@Body() dto: NotifyUsersDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.notificationsService.notifyUsers(dto, adminId);
  }
}
