import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminRatingsService } from './admin-ratings.service';
import { RatingsQueryDto } from './dto/ratings-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin — Ratings & Reviews')
@Controller('admin/ratings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminRatingsController {
  constructor(private readonly ratingsService: AdminRatingsService) {}

  @Get()
  @ApiOperation({ summary: 'List all ride ratings with filters' })
  @ApiResponse({ status: 200, description: 'Paginated ratings list' })
  listRatings(@Query() query: RatingsQueryDto) {
    return this.ratingsService.listRatings(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Rating statistics and low-rated drivers' })
  @ApiResponse({ status: 200, description: 'Rating stats and distribution' })
  getStats() {
    return this.ratingsService.getStats();
  }
}
