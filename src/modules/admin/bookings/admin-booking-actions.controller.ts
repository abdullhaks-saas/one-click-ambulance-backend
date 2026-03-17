import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminBookingsService } from './admin-bookings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { ForceCancelRideDto } from './dto/force-cancel-ride.dto';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Admin — Bookings')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminBookingActionsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Post('force-cancel-ride')
  @ApiOperation({ summary: 'Force cancel any active ride' })
  @ApiResponse({ status: 200, description: 'Ride force cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel - booking not active' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  forceCancelRide(
    @Body() dto: ForceCancelRideDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    return this.adminBookingsService.forceCancelRide(
      dto.booking_id,
      adminId,
      dto.reason,
      ipAddress,
    );
  }
}
