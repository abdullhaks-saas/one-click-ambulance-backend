import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminBookingsService } from './admin-bookings.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@ApiTags('Admin — Bookings')
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all bookings (placeholder)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated bookings (Phase 2)' })
  listBookings(@Query() query: PaginationDto) {
    return this.adminBookingsService.listBookings(query);
  }
}
