import { Module } from '@nestjs/common';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminPricingController],
  providers: [AdminPricingService],
  exports: [AdminPricingService],
})
export class AdminPricingModule {}
