import {
  applyDecorators,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { DailyRidesQueryDto } from './dto/daily-rides-query.dto';
import { TopDriversQueryDto } from './dto/top-drivers-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

function AnalyticsRangeQueries() {
  return applyDecorators(
    ApiQuery({ name: 'from', required: false, description: 'YYYY-MM-DD' }),
    ApiQuery({ name: 'to', required: false, description: 'YYYY-MM-DD' }),
    ApiQuery({ name: 'zone_id', required: false }),
    ApiQuery({ name: 'ambulance_type_id', required: false }),
  );
}

@ApiTags('Admin — Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('daily-rides')
  @AnalyticsRangeQueries()
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'YYYY-MM-DD; if set, overrides from/to for one day',
  })
  @ApiOperation({
    summary: 'Rides created per calendar day (optional single `date`)',
  })
  dailyRides(@Query() query: DailyRidesQueryDto) {
    return this.adminAnalyticsService.dailyRides(query);
  }

  @Get('weekly-rides')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Rides aggregated by week (Monday start)' })
  weeklyRides(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.weeklyRides(query);
  }

  @Get('monthly-rides')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Rides aggregated by calendar month' })
  monthlyRides(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.monthlyRides(query);
  }

  @Get('revenue-summary')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Successful payment totals by day' })
  revenueSummary(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.revenueSummary(query);
  }

  @Get('driver-utilization')
  @AnalyticsRangeQueries()
  @ApiOperation({
    summary:
      'Per-driver completed rides and trip duration/distance (ride_details)',
  })
  driverUtilization(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.driverUtilization(query);
  }

  @Get('average-response-time')
  @AnalyticsRangeQueries()
  @ApiOperation({
    summary: 'Mean seconds from assignment to acceptance (overall + by day)',
  })
  averageResponseTime(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.averageResponseTime(query);
  }

  @Get('top-drivers')
  @AnalyticsRangeQueries()
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'default 10, max 100',
  })
  @ApiOperation({
    summary: 'Top drivers by completed rides and commission credits',
  })
  topDrivers(@Query() query: TopDriversQueryDto) {
    return this.adminAnalyticsService.topDrivers(query);
  }

  @Get('ride-cancellations')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Cancellation counts and rate by reason' })
  rideCancellations(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.rideCancellations(query);
  }

  @Get('zone-demand')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Booking counts per zone' })
  zoneDemand(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.zoneDemand(query);
  }

  @Get('ambulance-type-demand')
  @AnalyticsRangeQueries()
  @ApiOperation({ summary: 'Booking counts per ambulance type' })
  ambulanceTypeDemand(@Query() query: AnalyticsQueryDto) {
    return this.adminAnalyticsService.ambulanceTypeDemand(query);
  }
}
