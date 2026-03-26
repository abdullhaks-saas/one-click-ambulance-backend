import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingRule } from '../../../database/entities/pricing-rule.entity';
import { AmbulanceType } from '../../../database/entities/ambulance-type.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';

export interface PricingRuleResponse {
  id: string;
  ambulance_type_id: string;
  ambulance_type_name: string;
  base_fare: number;
  per_km_price: number;
  emergency_charge: number;
  night_charge: number;
  minimum_fare: number;
  toll_charge: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AdminPricingService {
  constructor(
    @InjectRepository(PricingRule)
    private readonly pricingRuleRepo: Repository<PricingRule>,
    @InjectRepository(AmbulanceType)
    private readonly ambulanceTypeRepo: Repository<AmbulanceType>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async getAllPricingRules(): Promise<PricingRuleResponse[]> {
    const rules = await this.pricingRuleRepo.find({
      relations: ['ambulance_type'],
      order: { ambulance_type_id: 'ASC' },
    });

    const ambulanceTypes = await this.ambulanceTypeRepo.find({
      order: { name: 'ASC' },
    });

    const rulesByType = new Map(rules.map((r) => [r.ambulance_type_id, r]));
    const result: PricingRuleResponse[] = [];

    for (const at of ambulanceTypes) {
      const rule = rulesByType.get(at.id);
      result.push({
        id: rule?.id ?? '',
        ambulance_type_id: at.id,
        ambulance_type_name: at.name,
        base_fare: Number(rule?.base_fare ?? 0),
        per_km_price: Number(rule?.per_km_price ?? 0),
        emergency_charge: Number(rule?.emergency_charge ?? 0),
        night_charge: Number(rule?.night_charge ?? 0),
        minimum_fare: Number(rule?.minimum_fare ?? 0),
        toll_charge: Number(rule?.toll_charge ?? 0),
        created_at: rule?.created_at ?? at.created_at,
        updated_at: rule?.updated_at ?? at.created_at,
      });
    }

    return result;
  }

  async getPricingByAmbulanceType(
    ambulanceTypeId: string,
  ): Promise<PricingRuleResponse> {
    const ambulanceType = await this.ambulanceTypeRepo.findOne({
      where: { id: ambulanceTypeId },
    });
    if (!ambulanceType) {
      throw new NotFoundException('Ambulance type not found');
    }

    const rule = await this.pricingRuleRepo.findOne({
      where: { ambulance_type_id: ambulanceTypeId },
      relations: ['ambulance_type'],
    });

    return {
      id: rule?.id ?? '',
      ambulance_type_id: ambulanceType.id,
      ambulance_type_name: ambulanceType.name,
      base_fare: Number(rule?.base_fare ?? 0),
      per_km_price: Number(rule?.per_km_price ?? 0),
      emergency_charge: Number(rule?.emergency_charge ?? 0),
      night_charge: Number(rule?.night_charge ?? 0),
      minimum_fare: Number(rule?.minimum_fare ?? 0),
      toll_charge: Number(rule?.toll_charge ?? 0),
      created_at: rule?.created_at ?? ambulanceType.created_at,
      updated_at: rule?.updated_at ?? ambulanceType.created_at,
    };
  }

  async updatePricing(
    dto: {
      ambulance_type_id: string;
      base_fare?: number;
      per_km_price?: number;
      emergency_charge?: number;
      night_charge?: number;
      minimum_fare?: number;
      toll_charge?: number;
    },
    adminId: string,
  ): Promise<PricingRuleResponse> {
    const ambulanceType = await this.ambulanceTypeRepo.findOne({
      where: { id: dto.ambulance_type_id },
    });
    if (!ambulanceType) {
      throw new NotFoundException('Ambulance type not found');
    }

    const updates = {
      base_fare: dto.base_fare,
      per_km_price: dto.per_km_price,
      emergency_charge: dto.emergency_charge,
      night_charge: dto.night_charge,
      minimum_fare: dto.minimum_fare,
      toll_charge: dto.toll_charge,
    };
    const nonUndefined = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(nonUndefined).length === 0) {
      throw new BadRequestException(
        'At least one pricing field must be provided',
      );
    }

    let rule = await this.pricingRuleRepo.findOne({
      where: { ambulance_type_id: dto.ambulance_type_id },
      relations: ['ambulance_type'],
    });

    if (rule) {
      await this.pricingRuleRepo.update(rule.id, nonUndefined);
      rule = await this.pricingRuleRepo.findOneOrFail({
        where: { id: rule.id },
        relations: ['ambulance_type'],
      });
    } else {
      rule = this.pricingRuleRepo.create({
        ambulance_type_id: dto.ambulance_type_id,
        ...nonUndefined,
      });
      await this.pricingRuleRepo.save(rule);
      rule = await this.pricingRuleRepo.findOneOrFail({
        where: { id: rule.id },
        relations: ['ambulance_type'],
      });
    }

    await this.createAuditLog(
      adminId,
      'UPDATE_PRICING',
      'pricing_rules',
      rule.id,
      { ambulance_type_id: dto.ambulance_type_id, ...nonUndefined },
    );

    return {
      id: rule.id,
      ambulance_type_id: rule.ambulance_type_id,
      ambulance_type_name: rule.ambulance_type?.name ?? ambulanceType.name,
      base_fare: Number(rule.base_fare),
      per_km_price: Number(rule.per_km_price),
      emergency_charge: Number(rule.emergency_charge),
      night_charge: Number(rule.night_charge),
      minimum_fare: Number(rule.minimum_fare),
      toll_charge: Number(rule.toll_charge),
      created_at: rule.created_at,
      updated_at: rule.updated_at,
    };
  }

  private async createAuditLog(
    adminId: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const audit = this.auditLogRepo.create({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? undefined,
    });
    await this.auditLogRepo.save(audit);
  }
}
