import {
  Controller,
  Get,
  Post,
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
import { AdminPaymentsService } from './admin-payments.service';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { RetryFailedPaymentDto } from './dto/retry-failed-payment.dto';
import { ReconcileTransactionDto } from './dto/reconcile-transaction.dto';
import { CommissionQueryDto } from './dto/commission-query.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Admin — Payments & Finance')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminPaymentsFinanceController {
  constructor(private readonly adminPaymentsService: AdminPaymentsService) {}

  @Get('failed-transactions')
  @ApiOperation({ summary: 'Failed and pending payments' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200 })
  listFailed(@Query() query: PaymentListQueryDto) {
    return this.adminPaymentsService.listFailedTransactions(query);
  }

  @Post('retry-failed')
  @ApiOperation({
    summary: 'Refresh payment status from Razorpay (retry / sync)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 502, description: 'Razorpay error' })
  retryFailed(@Body() dto: RetryFailedPaymentDto) {
    return this.adminPaymentsService.retryFailedPayment(dto.payment_id);
  }

  @Get('reconciliation')
  @ApiOperation({ summary: 'Reconciliation view: payments + wallet ledger' })
  @ApiResponse({ status: 200 })
  reconciliation() {
    return this.adminPaymentsService.getReconciliation();
  }

  @Post('reconcile-transaction')
  @ApiOperation({
    summary: 'Re-fetch Razorpay state for a payment_transactions row',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 502, description: 'Razorpay error' })
  reconcileTransaction(@Body() dto: ReconcileTransactionDto) {
    return this.adminPaymentsService.reconcilePaymentTransaction(
      dto.payment_transaction_id,
    );
  }

  @Get('driver-commission')
  @ApiOperation({ summary: 'Commission breakdown per driver (wallet ledger)' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200 })
  driverCommission(@Query() query: CommissionQueryDto) {
    return this.adminPaymentsService.getDriverCommission(query);
  }

  @Get('platform-revenue')
  @ApiOperation({ summary: 'Platform revenue estimate from payments vs commission' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiResponse({ status: 200 })
  platformRevenue(@Query() query: CommissionQueryDto) {
    return this.adminPaymentsService.getPlatformRevenue(query);
  }
}
