import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../../database/entities/system-setting.entity';
import {
  AppPlatform,
  AppVersion,
} from '../../../database/entities/app-version.entity';

const SENSITIVE_KEY =
  /(secret|password|private|jwt|credential|api_key|access_key|auth_key)/i;

@Injectable()
export class PublicConfigService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(AppVersion)
    private readonly appVersionRepo: Repository<AppVersion>,
  ) {}

  async getPublicSettings(): Promise<Record<string, string>> {
    const rows = await this.settingsRepo.find();
    const out: Record<string, string> = {};
    for (const r of rows) {
      if (SENSITIVE_KEY.test(r.key)) continue;
      out[r.key] = r.value;
    }
    return out;
  }

  async getAppVersion(platform: string) {
    const p = String(platform).toLowerCase();
    if (p !== AppPlatform.ANDROID && p !== AppPlatform.IOS) {
      return {
        platform,
        version: null,
        mandatory: false,
        build_number: null,
        message: 'Use platform=android or platform=ios',
      };
    }
    const row = await this.appVersionRepo.findOne({
      where: { platform: p as AppPlatform },
    });
    if (!row) {
      return {
        platform: p,
        version: null,
        mandatory: false,
        build_number: null,
      };
    }
    return {
      platform: row.platform,
      version: row.version,
      mandatory: row.mandatory,
      build_number: row.build_number,
      release_notes: row.release_notes,
    };
  }
}
