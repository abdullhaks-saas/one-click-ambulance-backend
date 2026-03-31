import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserProfileService } from './user-profile.service';
import { UserRegisterDto } from './dto/register.dto';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdateUserDeviceDto } from './dto/update-device.dto';

@ApiTags('User — Profile')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('user')
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Post('register')
  @ApiOperation({ summary: 'Complete registration (name, optional email) after OTP' })
  @ApiResponse({ status: 201, description: 'Profile updated' })
  register(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: UserRegisterDto,
  ) {
    return this.profileService.register(auth.sub, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile' })
  getProfile(@CurrentUser() auth: JwtPayload) {
    return this.profileService.getProfile(auth.sub);
  }

  @Put('profile/update')
  @ApiOperation({ summary: 'Update profile fields' })
  updateProfile(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.profileService.updateProfile(auth.sub, dto);
  }

  @Put('device')
  @ApiOperation({ summary: 'Update FCM token and device id' })
  updateDevice(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: UpdateUserDeviceDto,
  ) {
    return this.profileService.updateDevice(auth.sub, dto);
  }
}
