import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddress } from '../../../database/entities/user-address.entity';
import { UserAddressService } from './user-address.service';
import { UserAddressController } from './user-address.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress])],
  controllers: [UserAddressController],
  providers: [UserAddressService],
})
export class UserAddressModule {}
