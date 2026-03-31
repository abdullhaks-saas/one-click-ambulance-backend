import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../shared/redis/redis.service';
import { SmsService } from '../../shared/sms/sms.service';
import { User } from '../../database/entities/user.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Role } from '../../common/enums/role.enum';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly smsService: SmsService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otpKey = `otp:${dto.mobile_number}:${dto.role}`;

    const existing = await this.redisService.get(otpKey);
    if (existing) {
      const ttl = await this.redisService.ttl(otpKey);
      const expirySec =
        (this.configService.get<number>('OTP_EXPIRY_MINUTES') ?? 5) * 60;
      if (ttl > expirySec - 30) {
        throw new BadRequestException(
          'OTP already sent. Please wait before requesting again.',
        );
      }
    }

    const otp = this.generateOtp();
    console.log('otp', otp);
    const expiry =
      (this.configService.get<number>('OTP_EXPIRY_MINUTES') ?? 5) * 60;
    await this.redisService.set(otpKey, otp, expiry);
    // await this.smsService.sendOtp(dto.mobile_number, otp);

    return { message: `OTP sent to ${dto.mobile_number}` };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpKey = `otp:${dto.mobile_number}:${dto.role}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.redisService.del(otpKey);

    const entity = await this.upsertEntity(dto.mobile_number, dto.role);

    const tokens = await this.generateTokens(
      entity.id,
      dto.role,
      dto.mobile_number,
    );
    return { user: entity, ...tokens };
  }

  async refreshTokens(userId: string, role: Role, refreshToken: string) {
    const redisKey = `refresh:${userId}:${role}`;
    const stored = await this.redisService.get(redisKey);

    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    return this.generateTokens(userId, role);
  }

  /** Verify refresh JWT, ensure role, then rotate access + refresh (Redis must match). */
  async refreshWithRefreshJwt(refreshToken: string, expectedRole: Role) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.role !== expectedRole) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.refreshTokens(payload.sub, expectedRole, refreshToken);
  }

  async logout(userId: string, role: Role): Promise<void> {
    await this.redisService.del(`refresh:${userId}:${role}`);
  }

  private async upsertEntity(
    mobile: string,
    role: Role,
  ): Promise<User | Driver> {
    if (role === Role.USER) {
      let user = await this.userRepo.findOne({
        where: { mobile_number: mobile },
      });
      if (!user) {
        user = this.userRepo.create({
          mobile_number: mobile,
          is_verified: true,
        });
        await this.userRepo.save(user);
      } else {
        await this.userRepo.update(user.id, { is_verified: true });
      }
      return user;
    } else {
      let driver = await this.driverRepo.findOne({
        where: { mobile_number: mobile },
      });
      if (!driver) {
        driver = this.driverRepo.create({
          mobile_number: mobile,
          is_verified: true,
        });
        await this.driverRepo.save(driver);
      } else {
        await this.driverRepo.update(driver.id, { is_verified: true });
      }
      return driver;
    }
  }

  private async generateTokens(sub: string, role: Role, mobile?: string) {
    const payload: JwtPayload = { sub, role, mobile };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
    });

    const refreshTtl = 30 * 24 * 60 * 60; // 30 days
    await this.redisService.set(
      `refresh:${sub}:${role}`,
      refreshToken,
      refreshTtl,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
