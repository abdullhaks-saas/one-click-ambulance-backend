import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserPaymentService } from './user-payment.service';
import { PaymentInitiateDto } from './dto/payment-initiate.dto';
import { PaymentVerifyDto } from './dto/payment-verify.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.query.dto';

@ApiTags('User — Payment')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('payment')
export class UserPaymentController {
  constructor(private readonly paymentService: UserPaymentService) {}

  @Post('initiate')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({ summary: 'Create Razorpay order after trip completed (Phase I)' })
  initiate(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: PaymentInitiateDto,
  ) {
    return this.paymentService.initiate(auth.sub, dto);
  }

  @Post('verify')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Verify Razorpay signature and sync payment (idempotent if already success)',
  })
  verify(@CurrentUser() auth: JwtPayload, @Body() dto: PaymentVerifyDto) {
    return this.paymentService.verify(auth.sub, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Paginated payment history for the customer' })
  history(
    @CurrentUser() auth: JwtPayload,
    @Query() query: PaymentHistoryQueryDto,
  ) {
    return this.paymentService.history(auth.sub, query);
  }
}
