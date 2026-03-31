import { Module } from '@nestjs/common';
import { DispatchModule } from '../../dispatch/dispatch.module';
import { DriverDispatchController } from './driver-dispatch.controller';

@Module({
  imports: [DispatchModule],
  controllers: [DriverDispatchController],
})
export class DriverDispatchModule {}
