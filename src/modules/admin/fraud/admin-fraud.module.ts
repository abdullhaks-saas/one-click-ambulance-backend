import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { AdminFraudService } from './admin-fraud.service';
import { FraudController } from './fraud.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [FraudController],
  providers: [AdminFraudService],
})
export class AdminFraudModule {}
