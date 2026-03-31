import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRideService } from './user-ride.service';
import { RideBookingIdQueryDto } from './dto/ride-booking-id.query.dto';

@ApiTags('User — Ride')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('ride')
export class UserRideController {
  constructor(private readonly rideService: UserRideService) {}

  @Get('details')
  @ApiOperation({
    summary:
      'Ride details: trip distance, duration, driver info, fare (owner only)',
  })
  getDetails(
    @CurrentUser() auth: JwtPayload,
    @Query() query: RideBookingIdQueryDto,
  ) {
    return this.rideService.getDetails(query.booking_id, auth.sub);
  }

  @Get('status')
  @ApiOperation({
    summary:
      'Current ride status + full booking/ride timeline (owner only)',
  })
  getStatus(
    @CurrentUser() auth: JwtPayload,
    @Query() query: RideBookingIdQueryDto,
  ) {
    return this.rideService.getStatus(query.booking_id, auth.sub);
  }

  @Get('generate-otp')
  @ApiOperation({
    summary:
      'Generate a 4-digit ride OTP for the passenger to share with the driver before trip start',
  })
  generateOtp(
    @CurrentUser() auth: JwtPayload,
    @Query() query: RideBookingIdQueryDto,
  ) {
    return this.rideService.generateOtp(query.booking_id, auth.sub);
  }

  @Get('live-location')
  @ApiOperation({
    summary:
      'Latest driver position for an active ride (DB + optional Firebase path) — Phase H',
  })
  liveLocation(
    @CurrentUser() auth: JwtPayload,
    @Query() query: RideBookingIdQueryDto,
  ) {
    return this.rideService.getLiveLocation(query.booking_id, auth.sub);
  }
}
