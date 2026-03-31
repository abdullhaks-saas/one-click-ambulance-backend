import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../database/entities/user.entity';
import { UserProfileService } from './user-profile.service';
import { UserProfileController } from './user-profile.controller';
import { CustomerAuthProfileController } from './customer-auth-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserProfileController, CustomerAuthProfileController],
  providers: [UserProfileService],
  exports: [UserProfileService],
})
export class UserProfileModule {}
