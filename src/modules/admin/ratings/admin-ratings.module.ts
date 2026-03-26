import { Module } from '@nestjs/common';
import { AdminRatingsController } from './admin-ratings.controller';
import { AdminRatingsService } from './admin-ratings.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminRatingsController],
  providers: [AdminRatingsService],
  exports: [AdminRatingsService],
})
export class AdminRatingsModule {}
