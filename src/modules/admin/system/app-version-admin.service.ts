import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AppVersion,
  AppPlatform,
} from '../../../database/entities/app-version.entity';
import { UpdateAppVersionDto } from './dto/update-app-version.dto';

@Injectable()
export class AppVersionAdminService {
  constructor(
    @InjectRepository(AppVersion)
    private readonly appVersionRepo: Repository<AppVersion>,
  ) {}

  async getAll() {
    const rows = await this.appVersionRepo.find();
    const byPlatform: Record<string, AppVersion | null> = {
      ios: null,
      android: null,
    };
    for (const r of rows) {
      byPlatform[r.platform] = r;
    }
    return { platforms: byPlatform, list: rows };
  }

  async upsert(dto: UpdateAppVersionDto) {
    const platform =
      dto.platform === 'ios' ? AppPlatform.IOS : AppPlatform.ANDROID;
    let row = await this.appVersionRepo.findOne({ where: { platform } });
    if (!row) {
      row = this.appVersionRepo.create({
        platform,
        version: dto.version,
        build_number: dto.build_number ?? null,
        mandatory: dto.mandatory ?? false,
        release_notes: dto.release_notes ?? null,
      });
    } else {
      row.version = dto.version;
      if (dto.build_number !== undefined) row.build_number = dto.build_number;
      if (dto.mandatory !== undefined) row.mandatory = dto.mandatory;
      if (dto.release_notes !== undefined)
        row.release_notes = dto.release_notes;
    }
    await this.appVersionRepo.save(row);
    return { message: 'App version updated', version: row };
  }
}
