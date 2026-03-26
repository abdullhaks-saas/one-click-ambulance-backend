import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDriversService } from './admin-drivers.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DriverIdDto, RejectDriverDto } from './dto/driver-action.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';

export interface AdminRequestUser {
  sub: string;
  role: Role;
}

@ApiTags('Admin — Driver Management')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminDriverActionsController {
  constructor(private readonly adminDriversService: AdminDriversService) {}

  @Post('driver/approve')
  @ApiOperation({ summary: 'Approve pending driver registration' })
  @ApiResponse({ status: 200, description: 'Driver approved successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  approveDriver(
    @Body() dto: DriverIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminDriversService.approveDriver(dto.driver_id, user.sub);
  }

  @Post('driver/reject')
  @ApiOperation({ summary: 'Reject driver with reason' })
  @ApiResponse({ status: 200, description: 'Driver rejected' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  rejectDriver(
    @Body() dto: RejectDriverDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminDriversService.rejectDriver(
      dto.driver_id,
      user.sub,
      dto.reason,
    );
  }

  @Post('driver/suspend')
  @ApiOperation({ summary: 'Suspend active driver' })
  @ApiResponse({ status: 200, description: 'Driver suspended' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  suspendDriver(
    @Body() dto: DriverIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminDriversService.suspendDriver(dto.driver_id, user.sub);
  }

  @Post('block-driver')
  @ApiOperation({ summary: 'Permanently block driver' })
  @ApiResponse({ status: 200, description: 'Driver blocked' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  blockDriver(@Body() dto: DriverIdDto, @CurrentUser() user: AdminRequestUser) {
    return this.adminDriversService.blockDriver(dto.driver_id, user.sub);
  }

  @Post('unblock-driver')
  @ApiOperation({ summary: 'Restore blocked driver' })
  @ApiResponse({ status: 200, description: 'Driver unblocked' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  unblockDriver(
    @Body() dto: DriverIdDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminDriversService.unblockDriver(dto.driver_id, user.sub);
  }

  @Post('driver-document/verify')
  @ApiOperation({ summary: 'Verify or reject a driver document' })
  @ApiResponse({ status: 200, description: 'Document verified or rejected' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  verifyDocument(
    @Body() dto: VerifyDocumentDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminDriversService.verifyDocument(
      dto.document_id,
      dto.status,
      user.sub,
    );
  }
}
