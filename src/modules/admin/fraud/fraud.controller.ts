import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AdminFraudService } from './admin-fraud.service';
import { FlagAccountDto } from './dto/flag-account.dto';
import { FlagDriverRequestDto } from './dto/flag-driver-request.dto';
import { FlagUserRequestDto } from './dto/flag-user-request.dto';
import { AdminJwtPayload } from '../types/admin-jwt-payload.type';

@ApiTags('Admin — Fraud detection')
@Controller('fraud')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class FraudController {
  constructor(private readonly fraudService: AdminFraudService) {}

  @Get('ride-anomalies')
  @ApiOperation({ summary: 'Phase 8: Unusual distance/time patterns' })
  rideAnomalies() {
    return this.fraudService.rideAnomalies();
  }

  @Get('gps-mismatch')
  @ApiOperation({
    summary: 'Phase 8: Rides where tracked path length >> straight line',
  })
  gpsMismatch() {
    return this.fraudService.gpsMismatch();
  }

  @Get('fake-location-drivers')
  @ApiOperation({ summary: 'Phase 8: Suspected stale or invalid GPS' })
  fakeLocations() {
    return this.fraudService.fakeLocationDrivers();
  }

  @Get('duplicate-accounts')
  @ApiOperation({ summary: 'Phase 8: Duplicate mobile / PAN document reuse' })
  duplicates() {
    return this.fraudService.duplicateAccounts();
  }

  @Post('flag-driver')
  @ApiOperation({
    summary:
      'Phase 8: Flag driver for manual review (plan: drivers + audit_logs)',
  })
  flagDriverBody(@Body() dto: FlagDriverRequestDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.fraudService.flagDriver(
      dto.driver_id,
      adminId,
      dto.reason,
      req.ip,
    );
  }

  @Post('flag-driver/:id')
  @ApiOperation({ summary: 'Phase 8: Flag driver (id in path, optional body)' })
  flagDriver(
    @Param('id') id: string,
    @Body() dto: FlagAccountDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.fraudService.flagDriver(id, adminId, dto.reason, req.ip);
  }

  @Post('flag-user')
  @ApiOperation({
    summary:
      'Phase 8: Flag user for manual review (plan: users + audit_logs)',
  })
  flagUserBody(@Body() dto: FlagUserRequestDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.fraudService.flagUser(
      dto.user_id,
      adminId,
      dto.reason,
      req.ip,
    );
  }

  @Post('flag-user/:id')
  @ApiOperation({ summary: 'Phase 8: Flag user (id in path, optional body)' })
  flagUser(
    @Param('id') id: string,
    @Body() dto: FlagAccountDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as AdminJwtPayload).sub;
    return this.fraudService.flagUser(id, adminId, dto.reason, req.ip);
  }
}
