import { Module } from '@nestjs/common';
import { AdminPayoutsController } from './admin-payouts.controller';
import { AdminPayoutProcessController } from './admin-payout-process.controller';
import { AdminPayoutsService } from './admin-payouts.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminPayoutsController, AdminPayoutProcessController],
  providers: [AdminPayoutsService],
})
export class AdminPayoutsModule {}
