import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverLocation } from '../../../database/entities/driver-location.entity';
import { Ambulance } from '../../../database/entities/ambulance.entity';
import { AmbulanceType } from '../../../database/entities/ambulance-type.entity';
import { UserAmbulanceService } from './user-ambulance.service';
import { UserAmbulanceController } from './user-ambulance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DriverLocation, Ambulance, AmbulanceType]),
  ],
  controllers: [UserAmbulanceController],
  providers: [UserAmbulanceService],
})
export class UserAmbulanceModule {}
