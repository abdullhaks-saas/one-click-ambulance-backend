import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DriverAuthController } from './driver-auth.controller';

@Module({
  imports: [AuthModule],
  controllers: [DriverAuthController],
})
export class DriverAuthModule {}
