import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SystemSetting } from '../../../database/entities/system-setting.entity';

@Injectable()
export class AdminHealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    @InjectRepository(SystemSetting)
    private readonly systemSettingsRepo: Repository<SystemSetting>,
  ) {}

  async getHealth() {
    let database: 'ok' | 'error' = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      database = 'error';
    }

    const rzId =
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      this.configService.get<string>('RAZORPAY_ID');
    const rzSec =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      this.configService.get<string>('RAZORPAY_SECRET');
    const razorpay = rzId && rzSec ? 'configured' : ('not_configured' as const);

    const firebase =
      this.configService.get<string>('FIREBASE_PROJECT_ID') ||
      this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS')
        ? 'configured'
        : ('not_configured' as const);

    let maintenance = false;
    try {
      const row = await this.systemSettingsRepo.findOne({
        where: { key: 'MAINTENANCE_MODE' },
      });
      maintenance = row?.value === 'true' || row?.value === '1';
    } catch {
      maintenance = false;
    }

    return {
      database,
      razorpay,
      firebase,
      maintenance_mode: maintenance,
      timestamp: new Date().toISOString(),
    };
  }
}
