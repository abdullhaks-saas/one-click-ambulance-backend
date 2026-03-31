import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserProfileService } from './user-profile.service';
import { UpdateUserProfileDto } from './dto/update-profile.dto';

/**
 * Aliases from project plan §11 (GET/PUT /auth/profile*) using the same JWT as user routes.
 */
@ApiTags('User — Auth')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('auth')
export class CustomerAuthProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Alias: GET /auth/profile (customer)' })
  getProfile(@CurrentUser() auth: JwtPayload) {
    return this.profileService.getProfile(auth.sub);
  }

  @Put('profile/update')
  @ApiOperation({ summary: 'Alias: PUT /auth/profile/update (customer)' })
  updateProfile(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.profileService.updateProfile(auth.sub, dto);
  }
}
