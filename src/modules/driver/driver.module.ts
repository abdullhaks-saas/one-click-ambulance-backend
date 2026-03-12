import { Module } from '@nestjs/common';
import { DriverAuthModule } from './auth/driver-auth.module';

@Module({
  imports: [DriverAuthModule],
})
export class DriverModule {}
