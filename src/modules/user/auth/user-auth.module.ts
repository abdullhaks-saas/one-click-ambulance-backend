import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { UserAuthController } from './user-auth.controller';

@Module({
  imports: [AuthModule],
  controllers: [UserAuthController],
})
export class UserAuthModule {}
