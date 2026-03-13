import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAmbulancesService } from './admin-ambulances.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  AmbulanceIdDto,
  SuspendAmbulanceDto,
} from './dto/ambulance-action.dto';

interface AdminRequestUser {
  sub: string;
  role: Role;
}

@ApiTags('Admin — Ambulance Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminAmbulanceActionsController {
  constructor(
    private readonly adminAmbulancesService: AdminAmbulancesService,
  ) {}

  @Post('ambulance/approve')
  @ApiOperation({ summary: 'Approve ambulance registration' })
  @ApiResponse({ status: 200, description: 'Ambulance approved successfully' })
  @ApiResponse({ status: 404, description: 'Ambulance not found' })
  approveAmbulance(
    @Body() dto: AmbulanceIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminAmbulancesService.approveAmbulance(
      dto.ambulance_id,
      user.sub,
    );
  }

  @Post('ambulance/suspend')
  @ApiOperation({ summary: 'Suspend ambulance' })
  @ApiResponse({ status: 200, description: 'Ambulance suspended' })
  @ApiResponse({ status: 404, description: 'Ambulance not found' })
  suspendAmbulance(
    @Body() dto: AmbulanceIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminAmbulancesService.suspendAmbulance(
      dto.ambulance_id,
      user.sub,
    );
  }

  @Post('suspend-ambulance')
  @ApiOperation({
    summary: 'Suspend ambulance (alias with extended reason)',
  })
  @ApiResponse({ status: 200, description: 'Ambulance suspended' })
  @ApiResponse({ status: 404, description: 'Ambulance not found' })
  suspendAmbulanceWithReason(
    @Body() dto: SuspendAmbulanceDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminAmbulancesService.suspendAmbulance(
      dto.ambulance_id,
      user.sub,
      dto.reason,
    );
  }

  @Post('restore-ambulance')
  @ApiOperation({ summary: 'Restore suspended ambulance' })
  @ApiResponse({ status: 200, description: 'Ambulance restored successfully' })
  @ApiResponse({ status: 404, description: 'Ambulance not found' })
  restoreAmbulance(
    @Body() dto: AmbulanceIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminAmbulancesService.restoreAmbulance(
      dto.ambulance_id,
      user.sub,
    );
  }
}
