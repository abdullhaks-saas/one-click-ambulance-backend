import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { DatabaseModule } from '../../database/database.module';
import { SmsModule } from '../../shared/sms/sms.module';

@Module({
  imports: [
    DatabaseModule,
    SmsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, AdminJwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
