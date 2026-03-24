import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminPayoutsService } from './admin-payouts.service';
import { PayoutListQueryDto } from './dto/payout-list-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin — Payouts')
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminPayoutsController {
  constructor(private readonly adminPayoutsService: AdminPayoutsService) {}

  @Get()
  @ApiOperation({ summary: 'List all payout records' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200 })
  listPayouts(@Query() query: PayoutListQueryDto) {
    return this.adminPayoutsService.listPayouts(query);
  }

  @Get(':driver_id')
  @ApiOperation({ summary: 'Payout history for a driver' })
  @ApiParam({ name: 'driver_id', description: 'Driver UUID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  listByDriver(
    @Param('driver_id') driverId: string,
    @Query() query: PayoutListQueryDto,
  ) {
    return this.adminPayoutsService.listPayoutsByDriver(driverId, query);
  }
}
