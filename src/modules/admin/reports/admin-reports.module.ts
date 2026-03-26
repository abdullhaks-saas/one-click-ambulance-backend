import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AdminReportsService } from './admin-reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [ReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
