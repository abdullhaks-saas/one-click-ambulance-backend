import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin — Dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  getDashboard() {
    return this.adminDashboardService.getDashboardMetrics();
  }
}
