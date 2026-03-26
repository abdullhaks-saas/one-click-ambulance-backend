import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminDriversService } from './admin-drivers.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { DriverListQueryDto } from './dto/driver-list-query.dto';
import { DriverStatus } from '../../../database/entities/driver.entity';

@ApiTags('Admin — Driver Management')
@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminDriversController {
  constructor(private readonly adminDriversService: AdminDriversService) {}

  @Get()
  @ApiOperation({ summary: 'List all drivers (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DriverStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated driver list' })
  listDrivers(@Query() query: DriverListQueryDto) {
    return this.adminDriversService.listDrivers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Full driver detail with documents' })
  @ApiResponse({
    status: 200,
    description: 'Driver detail with documents and bank accounts',
  })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  getDriverById(@Param('id') id: string) {
    return this.adminDriversService.getDriverById(id);
  }
}
