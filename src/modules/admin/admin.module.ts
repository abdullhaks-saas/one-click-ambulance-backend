import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminDriversModule } from './drivers/admin-drivers.module';
import { AdminBookingsModule } from './bookings/admin-bookings.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('ADMIN_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('ADMIN_JWT_EXPIRES_IN') ?? '8h',
        },
      }),
      inject: [ConfigService],
    }),
    AdminAuthModule,
    AdminDashboardModule,
    AdminUsersModule,
    AdminDriversModule,
    AdminBookingsModule,
  ],
})
export class AdminModule {}
