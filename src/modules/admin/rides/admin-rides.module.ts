import { Module } from '@nestjs/common';
import { AdminRidesController } from './admin-rides.controller';
import { AdminRidesService } from './admin-rides.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminRidesController],
  providers: [AdminRidesService],
  exports: [AdminRidesService],
})
export class AdminRidesModule {}
