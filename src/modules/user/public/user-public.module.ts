import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemSetting } from '../../../database/entities/system-setting.entity';
import { AppVersion } from '../../../database/entities/app-version.entity';
import { PublicConfigController } from './public-config.controller';
import { PublicConfigService } from './public-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSetting, AppVersion])],
  controllers: [PublicConfigController],
  providers: [PublicConfigService],
})
export class UserPublicModule {}
