import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../auth/auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Role } from '../../../common/enums/role.enum';

@ApiTags('Driver — Auth')
@Controller('driver/auth')
export class DriverAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp({ ...dto, role: Role.DRIVER });
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and receive JWT tokens' })
  @ApiResponse({
    status: 201,
    description: 'Returns access_token + refresh_token + driver object',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp({ ...dto, role: Role.DRIVER });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(
      body.user_id,
      Role.DRIVER,
      body.refresh_token,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidates refresh token' })
  logout(@CurrentUser() user: { sub: string; role: Role }) {
    return this.authService.logout(user.sub, user.role);
  }
}
