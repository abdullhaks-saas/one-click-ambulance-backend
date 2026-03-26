import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminAlertsService } from './admin-alerts.service';
import { AlertsQueryDto } from './dto/alerts-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin — Alerts')
@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminAlertsController {
  constructor(private readonly alertsService: AdminAlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List admin alerts' })
  @ApiResponse({ status: 200, description: 'Paginated alerts list' })
  listAlerts(@Query() query: AlertsQueryDto) {
    return this.alertsService.listAlerts(query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread alerts' })
  @ApiResponse({ status: 200, description: 'Unread alert count' })
  getUnreadCount() {
    return this.alertsService.getUnreadCount();
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark single alert as read' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  markAsRead(@Param('id') id: string) {
    return this.alertsService.markAsRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all alerts as read' })
  markAllAsRead() {
    return this.alertsService.markAllAsRead();
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss an alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  dismissAlert(@Param('id') id: string) {
    return this.alertsService.dismissAlert(id);
  }

  @Post('check')
  @ApiOperation({ summary: 'Trigger alert checks (low availability, etc.)' })
  triggerCheck() {
    return this.alertsService.checkAndCreateAlerts();
  }
}
