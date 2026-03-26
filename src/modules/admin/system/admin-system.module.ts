import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../../../database/database.module';
import { SystemSettingsService } from './system-settings.service';
import { AdminHealthService } from './admin-health.service';
import { AdminMonitoringService } from './admin-monitoring.service';
import { SupportTicketsService } from './support-tickets.service';
import { AppVersionAdminService } from './app-version-admin.service';
import { AdminLiveMapService } from './admin-live-map.service';
import { SystemSettingsController } from './system-settings.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AppVersionController } from './app-version.controller';
import { SupportController } from './support.controller';

@Module({
  imports: [DatabaseModule, ConfigModule],
  controllers: [
    SystemSettingsController,
    AdminOpsController,
    AppVersionController,
    SupportController,
  ],
  providers: [
    SystemSettingsService,
    AdminHealthService,
    AdminMonitoringService,
    SupportTicketsService,
    AppVersionAdminService,
    AdminLiveMapService,
  ],
})
export class AdminSystemModule {}
