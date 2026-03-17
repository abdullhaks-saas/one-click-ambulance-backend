import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AdminRidesService } from './admin-rides.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { RideListQueryDto } from './dto/ride-list-query.dto';

@ApiTags('Admin — Rides')
@Controller('admin/rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminRidesController {
  constructor(private readonly adminRidesService: AdminRidesService) {}

  @Get()
  @ApiOperation({ summary: 'List all rides with status filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'zone_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated rides list' })
  listRides(@Query() query: RideListQueryDto) {
    return this.adminRidesService.listRides(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ride detail with tracking path' })
  @ApiParam({ name: 'id', description: 'Booking ID (ride identifier)' })
  @ApiResponse({ status: 200, description: 'Ride detail with tracking path' })
  @ApiResponse({ status: 404, description: 'Ride not found' })
  getRideById(@Param('id') id: string) {
    return this.adminRidesService.getRideById(id);
  }
}
