import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminZonesService } from './admin-zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { UpdateZoneWithIdDto } from './dto/update-zone-with-id.dto';
import { AssignDriverDto } from './dto/assign-driver.dto';
import { ZoneIdDto } from './dto/zone-id.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

interface AdminRequestUser {
  sub: string;
  role: Role;
}

@ApiTags('Admin — Zone Management')
@Controller('admin/zones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminZonesController {
  constructor(private readonly adminZonesService: AdminZonesService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create new service zone with coordinates' })
  @ApiResponse({ status: 201, description: 'Zone created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  createZone(
    @Body() dto: CreateZoneDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminZonesService.createZone(dto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all zones with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated zone list' })
  listZones(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminZonesService.listZones(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update zone name and/or boundary' })
  @ApiResponse({ status: 200, description: 'Zone updated successfully' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  updateZone(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminZonesService.updateZone(id, dto, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a zone' })
  @ApiResponse({ status: 200, description: 'Zone deleted successfully' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  deleteZone(@Param('id') id: string, @CurrentUser() user: AdminRequestUser) {
    return this.adminZonesService.deleteZone(id, user.sub);
  }

  @Post(':id/assign-driver')
  @ApiOperation({ summary: 'Assign driver to a zone' })
  @ApiResponse({ status: 200, description: 'Driver assigned successfully' })
  @ApiResponse({ status: 404, description: 'Zone or driver not found' })
  @ApiResponse({ status: 409, description: 'Driver already assigned to zone' })
  assignDriver(
    @Param('id') zoneId: string,
    @Body() dto: AssignDriverDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminZonesService.assignDriverToZone(
      zoneId,
      dto.driver_id,
      user.sub,
    );
  }

  @Delete(':id/drivers/:driverId')
  @ApiOperation({ summary: 'Remove driver from zone' })
  @ApiResponse({ status: 200, description: 'Driver removed from zone' })
  @ApiResponse({ status: 404, description: 'Driver assignment not found' })
  removeDriver(
    @Param('id') zoneId: string,
    @Param('driverId') driverId: string,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminZonesService.removeDriverFromZone(
      zoneId,
      driverId,
      user.sub,
    );
  }

  @Get(':id/drivers')
  @ApiOperation({ summary: 'List drivers assigned to a zone' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of drivers in zone' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  listDriversInZone(
    @Param('id') zoneId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminZonesService.listDriversInZone(
      zoneId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}
