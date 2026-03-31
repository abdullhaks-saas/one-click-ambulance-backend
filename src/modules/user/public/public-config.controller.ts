import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PublicConfigService } from './public-config.service';

/**
 * Public endpoints safe for unauthenticated mobile bootstrap.
 * Paths under `/public/*` avoid clashes with admin `/system/*` and `/app/*`.
 */
@ApiTags('User — System (public)')
@Public()
@Controller('public')
export class PublicConfigController {
  constructor(private readonly publicConfig: PublicConfigService) {}

  @Get('system-settings')
  @ApiOperation({
    summary:
      'Non-sensitive system_settings key/values (Phase O; same intent as GET /system/settings for apps)',
  })
  systemSettings() {
    return this.publicConfig.getPublicSettings();
  }

  @Get('app-version')
  @ApiOperation({
    summary: 'Force-update check payload (Phase O; query: platform=android|ios)',
  })
  appVersion(@Query('platform') platform: string) {
    return this.publicConfig.getAppVersion(platform ?? '');
  }
}
