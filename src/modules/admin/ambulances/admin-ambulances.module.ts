import { Module } from '@nestjs/common';
import { AdminAmbulancesController } from './admin-ambulances.controller';
import { AdminAmbulanceActionsController } from './admin-ambulance-actions.controller';
import { AdminAmbulancesService } from './admin-ambulances.service';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminAmbulancesController, AdminAmbulanceActionsController],
  providers: [AdminAmbulancesService],
  exports: [AdminAmbulancesService],
})
export class AdminAmbulancesModule {}
