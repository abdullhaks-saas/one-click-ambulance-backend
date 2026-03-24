import { Module } from '@nestjs/common';
import { AdminPaymentsController } from './admin-payments.controller';
import { AdminPaymentsFinanceController } from './admin-payments-finance.controller';
import { AdminPaymentsService } from './admin-payments.service';
import { DatabaseModule } from '../../../database/database.module';
import { RazorpayModule } from '../../../shared/razorpay/razorpay.module';

@Module({
  imports: [DatabaseModule, RazorpayModule],
  controllers: [AdminPaymentsController, AdminPaymentsFinanceController],
  providers: [AdminPaymentsService],
})
export class AdminPaymentsModule {}
