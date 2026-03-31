import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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

const USER_REFRESH_COOKIE = 'user_refresh_token';
const USER_REFRESH_COOKIE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

@ApiTags('User — Auth')
@Controller('user/auth')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  private setUserRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(USER_REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: USER_REFRESH_COOKIE_MAX_MS,
    });
  }

  private clearUserRefreshCookie(res: Response) {
    res.clearCookie(USER_REFRESH_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to mobile number' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp({ ...dto, role: Role.USER });
  }

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('verify-otp')
  @ApiOperation({
    summary:
      'Verify OTP — returns access_token + user; sets httpOnly refresh cookie (same pattern as admin)',
  })
  @ApiResponse({
    status: 201,
    description:
      'user + tokens in JSON; Set-Cookie user_refresh_token for browsers (prefer cookie on web; mobile may use body.refresh_token)',
  })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp({ ...dto, role: Role.USER });
    this.setUserRefreshCookie(res, result.refresh_token);
    return {
      user: result.user,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'New access token — uses user_refresh_token cookie or body.refresh_token',
  })
  async refresh(
    @Req() req: Request,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fromCookie = req.cookies?.[USER_REFRESH_COOKIE] as
      | string
      | undefined;
    const refreshToken = fromCookie ?? body?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token missing (cookie or body.refresh_token)',
      );
    }
    const tokens = await this.authService.refreshWithRefreshJwt(
      refreshToken,
      Role.USER,
    );
    this.setUserRefreshCookie(res, tokens.refresh_token);
    return { access_token: tokens.access_token };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — clears refresh cookie and revokes refresh in Redis' })
  async logout(
    @CurrentUser() user: { sub: string; role: Role },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.sub, user.role);
    this.clearUserRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }
}
