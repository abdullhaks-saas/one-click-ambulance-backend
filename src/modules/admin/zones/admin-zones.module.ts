import { Module } from '@nestjs/common';
import { AdminZonesController } from './admin-zones.controller';
import { AdminZonesService } from './admin-zones.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminZonesController],
  providers: [AdminZonesService],
  exports: [AdminZonesService],
})
export class AdminZonesModule {}
