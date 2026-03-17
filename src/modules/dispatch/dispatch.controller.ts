import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { DispatchService } from './dispatch.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { CancelAssignmentDto } from './dto/cancel-assignment.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { DriverTimeoutDto } from './dto/driver-timeout.dto';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Dispatch')
@Controller('dispatch')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('manual-assign')
  @ApiOperation({ summary: 'Admin manually assigns driver to booking' })
  @ApiResponse({ status: 200, description: 'Driver assigned' })
  @ApiResponse({ status: 404, description: 'Booking or driver not found' })
  manualAssign(@Body() dto: ManualAssignDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress;
    return this.dispatchService.manualAssign(
      dto.booking_id,
      dto.driver_id,
      adminId,
      ipAddress,
    );
  }

  @Post('cancel-assignment')
  @ApiOperation({ summary: 'Cancel current driver assignment' })
  @ApiResponse({ status: 200, description: 'Assignment cancelled' })
  cancelAssignment(@Body() dto: CancelAssignmentDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress;
    return this.dispatchService.cancelAssignment(
      dto.booking_id,
      adminId,
      ipAddress,
    );
  }

  @Get('available-drivers')
  @ApiOperation({ summary: 'List available drivers in a zone' })
  @ApiQuery({ name: 'zone_id', required: true, description: 'Zone ID' })
  @ApiResponse({ status: 200, description: 'List of available drivers' })
  availableDrivers(@Query('zone_id') zoneId: string) {
    return this.dispatchService.availableDrivers(zoneId);
  }

  @Get('find-driver')
  @ApiOperation({ summary: 'Find nearest driver for a booking (10km radius)' })
  @ApiQuery({ name: 'booking_id', required: true, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Nearest available driver or null' })
  findDriver(@Query('booking_id') bookingId: string) {
    return this.dispatchService.findDriver(bookingId);
  }

  @Post('assign-driver')
  @ApiOperation({ summary: 'Auto-assign nearest driver' })
  @ApiResponse({ status: 200, description: 'Driver assigned or not found' })
  assignDriver(@Body() dto: AssignDriverDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress;
    return this.dispatchService.assignDriver(
      dto.booking_id,
      adminId,
      ipAddress,
    );
  }

  @Post('retry-assignment')
  @ApiOperation({ summary: 'Retry if driver rejected/timed out' })
  @ApiResponse({ status: 200, description: 'New driver assigned or not found' })
  retryAssignment(@Body() dto: AssignDriverDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress;
    return this.dispatchService.retryAssignment(
      dto.booking_id,
      adminId,
      ipAddress,
    );
  }

  @Post('driver-timeout')
  @ApiOperation({ summary: 'Handle 15-second acceptance timeout' })
  @ApiResponse({ status: 200, description: 'Timeout processed' })
  @ApiResponse({ status: 400, description: 'Driver already accepted' })
  driverTimeout(@Body() dto: DriverTimeoutDto, @Req() req: Request) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? (req.socket as { remoteAddress?: string })?.remoteAddress;
    return this.dispatchService.driverTimeout(
      dto.assignment_id,
      adminId,
      ipAddress,
    );
  }
}
