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
import { SystemSettingsService } from './system-settings.service';
import { AdminHealthService } from './admin-health.service';
import { AdminMonitoringService } from './admin-monitoring.service';
import { AdminLiveMapService } from './admin-live-map.service';
import { AppVersionAdminService } from './app-version-admin.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { MaintenanceModeDto } from './dto/maintenance-mode.dto';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';
import { LogsQueryDto } from './dto/logs-query.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — System & monitoring')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminOpsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly adminHealthService: AdminHealthService,
    private readonly adminMonitoringService: AdminMonitoringService,
    private readonly adminLiveMapService: AdminLiveMapService,
    private readonly appVersionAdminService: AppVersionAdminService,
  ) {}

  @Post('update-system-setting')
  @ApiOperation({ summary: 'Phase 10.1: Alias update setting + audit' })
  aliasUpdateSetting(@Body() dto: UpdateSettingDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.systemSettingsService.updateByKey(dto.key, dto.value, adminId, {
      aliasAudit: true,
      ipAddress: req.ip,
    });
  }

  @Get('system-health')
  @ApiOperation({ summary: 'Phase 10.1: DB / Razorpay / Firebase probe' })
  systemHealth() {
    return this.adminHealthService.getHealth();
  }

  @Post('maintenance-mode')
  @ApiOperation({ summary: 'Phase 10.1: Toggle MAINTENANCE_MODE flag' })
  maintenanceMode(@Body() dto: MaintenanceModeDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.systemSettingsService.setMaintenanceMode(
      dto.enabled,
      adminId,
      req.ip,
    );
  }

  @Get('error-logs')
  @ApiOperation({ summary: 'Phase 10.2: Backend error log table' })
  errorLogs(@Query() query: LogsQueryDto) {
    return this.adminMonitoringService.listErrorLogs(query);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Phase 10.2: Admin audit trail' })
  auditLogs(@Query() query: LogsQueryDto) {
    return this.adminMonitoringService.listAuditLogs(query);
  }

  @Get('live-map')
  @ApiOperation({ summary: 'Phase 10.5: Driver locations + active bookings' })
  liveMap() {
    return this.adminLiveMapService.getLiveMap();
  }

  @Post('app/version/update')
  @ApiOperation({ summary: 'Phase 10.4: Publish app version per platform' })
  updateAppVersion(@Body() dto: UpdateAppVersionDto) {
    return this.appVersionAdminService.upsert(dto);
  }
}
