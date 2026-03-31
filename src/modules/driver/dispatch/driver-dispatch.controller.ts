import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { DispatchService } from '../../dispatch/dispatch.service';
import {
  DriverRideAssignmentDto,
  DriverRideRejectDto,
} from './dto/driver-ride-assignment.dto';

/**
 * Driver ride responses for **customer auto-dispatch** (§7 / Phase F).
 * Admin operators continue to use `/dispatch/*` (JWT admin only) — no path overlap.
 */
@ApiTags('Driver — Rides')
@ApiBearerAuth('access-token')
@Roles(Role.DRIVER)
@Controller('driver')
export class DriverDispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('ride-accept')
  @ApiOperation({
    summary:
      'Accept the current ride offer (matches plan POST /driver/ride-accept)',
  })
  rideAccept(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: DriverRideAssignmentDto,
  ) {
    return this.dispatchService.driverAcceptRide(dto.assignment_id, auth.sub);
  }

  @Post('ride-reject')
  @ApiOperation({
    summary:
      'Reject offer; next nearest driver is offered (matches plan POST /driver/ride-reject)',
  })
  rideReject(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: DriverRideRejectDto,
  ) {
    return this.dispatchService.driverRejectRide(
      dto.assignment_id,
      auth.sub,
      dto.rejection_reason,
    );
  }
}
