import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../../database/entities/system-setting.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async getAll() {
    const rows = await this.settingsRepo.find({ order: { key: 'ASC' } });
    return {
      settings: rows.reduce<Record<string, string>>((acc, r) => {
        acc[r.key] = r.value;
        return acc;
      }, {}),
      rows,
    };
  }

  async updateByKey(
    key: string,
    value: string,
    adminId: string,
    options?: { aliasAudit?: boolean; ipAddress?: string },
  ) {
    let row = await this.settingsRepo.findOne({ where: { key } });
    if (!row) {
      row = this.settingsRepo.create({ key, value });
    } else {
      row.value = value;
    }
    await this.settingsRepo.save(row);

    await this.auditLogRepo.save(
      this.auditLogRepo.create({
        admin_id: adminId,
        action: options?.aliasAudit
          ? 'ADMIN_UPDATE_SYSTEM_SETTING'
          : 'UPDATE_SYSTEM_SETTING',
        entity_type: 'system_settings',
        entity_id: row.id,
        metadata: { key, value },
        ip_address: options?.ipAddress,
      }),
    );
    return { message: 'Setting saved', key, value };
  }

  async setMaintenanceMode(enabled: boolean, adminId: string, ip?: string) {
    return this.updateByKey(
      'MAINTENANCE_MODE',
      enabled ? 'true' : 'false',
      adminId,
      { ipAddress: ip },
    );
  }
}
