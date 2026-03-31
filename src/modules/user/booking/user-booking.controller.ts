import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserBookingService } from './user-booking.service';
import { EstimateFareQueryDto } from './dto/estimate-fare.query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { BookingHistoryQueryDto } from './dto/booking-history.query.dto';

@ApiTags('User — Booking')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('booking')
export class UserBookingController {
  constructor(private readonly bookingService: UserBookingService) {}

  @Get('estimate-fare')
  @ApiOperation({
    summary:
      'Estimate fare from pricing_rules (distance via Google Maps, haversine fallback, or client distance_km)',
  })
  estimateFare(@Query() query: EstimateFareQueryDto) {
    return this.bookingService.estimateFare(query);
  }

  @Post('create')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Create booking, store estimate, start driver search and auto-offer nearest driver',
  })
  create(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingService.createBooking(auth.sub, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Current booking status and recent timeline (owner only)' })
  status(
    @CurrentUser() auth: JwtPayload,
    @Query('booking_id', ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookingService.getStatus(bookingId, auth.sub);
  }

  @Get('details')
  @ApiOperation({
    summary: 'Full booking detail: addresses, fare, assignments, ride timeline',
  })
  details(
    @CurrentUser() auth: JwtPayload,
    @Query('booking_id', ParseUUIDPipe) bookingId: string,
  ) {
    return this.bookingService.getDetails(bookingId, auth.sub);
  }

  @Post('cancel')
  @ApiOperation({
    summary:
      'Cancel before driver accepts; notifies assigned driver and clears dispatch state',
  })
  cancel(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: CancelBookingDto,
  ) {
    return this.bookingService.cancelBooking(
      auth.sub,
      dto.booking_id,
      dto.cancellation_reason,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated list of the user’s bookings' })
  history(
    @CurrentUser() auth: JwtPayload,
    @Query() query: BookingHistoryQueryDto,
  ) {
    return this.bookingService.listHistory(auth.sub, query);
  }
}
