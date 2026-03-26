import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { AppVersionAdminService } from './app-version-admin.service';

@ApiTags('Admin — App version (Phase 10.4)')
@Controller('app')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AppVersionController {
  constructor(
    private readonly appVersionAdminService: AppVersionAdminService,
  ) {}

  @Get('version')
  @ApiOperation({ summary: 'Phase 10.3: Current versions per platform' })
  version() {
    return this.appVersionAdminService.getAll();
  }
}
