import {
  Controller,
  Get,
  Post,
  Put,
  Param,
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
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DriverStatus } from '../../database/entities/driver.entity';

@ApiTags('Admin — Dashboard')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('drivers')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'List all drivers (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: DriverStatus })
  @ApiResponse({ status: 200, description: 'Paginated driver list' })
  listDrivers(@Query() query: PaginationDto & { status?: DriverStatus }) {
    return this.adminService.listDrivers(query);
  }

  @Get('users')
  @ApiTags('Admin — User Management')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  listUsers(@Query() query: PaginationDto) {
    return this.adminService.listUsers(query);
  }

  @Post('driver/approve/:id')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'Approve driver registration' })
  approveDriver(@Param('id') id: string) {
    return this.adminService.approveDriver(id);
  }

  @Post('driver/reject/:id')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'Reject driver application' })
  rejectDriver(@Param('id') id: string) {
    return this.adminService.rejectDriver(id);
  }

  @Post('driver/suspend/:id')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'Suspend driver' })
  suspendDriver(@Param('id') id: string) {
    return this.adminService.suspendDriver(id);
  }

  @Post('block-driver/:id')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'Block driver permanently' })
  blockDriver(@Param('id') id: string) {
    return this.adminService.blockDriver(id);
  }

  @Post('unblock-driver/:id')
  @ApiTags('Admin — Driver Management')
  @ApiOperation({ summary: 'Unblock driver' })
  unblockDriver(@Param('id') id: string) {
    return this.adminService.unblockDriver(id);
  }

  @Post('block-user/:id')
  @ApiTags('Admin — User Management')
  @ApiOperation({ summary: 'Block user account' })
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Post('unblock-user/:id')
  @ApiTags('Admin — User Management')
  @ApiOperation({ summary: 'Unblock user' })
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }
}
