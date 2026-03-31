import { Module } from '@nestjs/common';
import { DriverAuthModule } from './auth/driver-auth.module';
import { DriverDispatchModule } from './dispatch/driver-dispatch.module';

@Module({
  imports: [DriverAuthModule, DriverDispatchModule],
})
export class DriverModule {}
