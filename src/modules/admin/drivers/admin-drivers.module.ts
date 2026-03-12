import { Module } from '@nestjs/common';
import { AdminDriversController } from './admin-drivers.controller';
import { AdminDriversService } from './admin-drivers.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDriversController],
  providers: [AdminDriversService],
  exports: [AdminDriversService],
})
export class AdminDriversModule {}
