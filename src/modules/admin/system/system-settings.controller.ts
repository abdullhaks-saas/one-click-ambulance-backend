import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — System settings')
@Controller('system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Phase 10.1: All system config key/values' })
  getSettings() {
    return this.systemSettingsService.getAll();
  }

  @Put('settings/update')
  @ApiOperation({ summary: 'Phase 10.1: Update setting by key' })
  update(@Body() dto: UpdateSettingDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ip = req.ip;
    return this.systemSettingsService.updateByKey(dto.key, dto.value, adminId, {
      ipAddress: ip,
    });
  }
}
