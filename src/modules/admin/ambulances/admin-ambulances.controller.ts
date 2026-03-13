import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAmbulancesService } from './admin-ambulances.service';
import { AmbulanceListQueryDto } from './dto/ambulance-list-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AmbulanceStatus } from '../../../database/entities/ambulance.entity';

@ApiTags('Admin — Ambulance Management')
@Controller('admin/ambulances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminAmbulancesController {
  constructor(
    private readonly adminAmbulancesService: AdminAmbulancesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all ambulances with filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: AmbulanceStatus })
  @ApiQuery({ name: 'ambulance_type_id', required: false, type: String })
  @ApiQuery({ name: 'driver_id', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated ambulance list' })
  listAmbulances(@Query() query: AmbulanceListQueryDto) {
    return this.adminAmbulancesService.listAmbulances(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambulance detail with equipment list' })
  @ApiResponse({ status: 200, description: 'Ambulance detail with equipment' })
  @ApiResponse({ status: 404, description: 'Ambulance not found' })
  getAmbulanceById(@Param('id') id: string) {
    return this.adminAmbulancesService.getAmbulanceById(id);
  }
}
