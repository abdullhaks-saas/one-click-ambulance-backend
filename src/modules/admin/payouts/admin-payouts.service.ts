import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payout, PayoutStatus } from '../../../database/entities/payout.entity';
import { PayoutTransaction } from '../../../database/entities/payout-transaction.entity';
import { DriverWallet } from '../../../database/entities/driver-wallet.entity';
import { WalletTransaction } from '../../../database/entities/wallet-transaction.entity';
import { WalletTransactionType } from '../../../database/entities/wallet-transaction.entity';
import { DriverBankAccount } from '../../../database/entities/driver-bank-account.entity';
import { AuditLog } from '../../../database/entities/audit-log.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { PayoutListQueryDto } from './dto/payout-list-query.dto';

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

@Injectable()
export class AdminPayoutsService {
  constructor(
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(DriverWallet)
    private readonly walletRepo: Repository<DriverWallet>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly dataSource: DataSource,
  ) {}

  async listPayouts(query: PayoutListQueryDto) {
    const { page = 1, limit = 20, status, from, to } = query;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.driver', 'd')
      .leftJoinAndSelect('po.driver_bank_account', 'ba')
      .orderBy('po.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('po.status = :status', { status });
    }
    if (from) {
      qb.andWhere('DATE(po.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(po.created_at) <= :to', { to });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((po) => ({
        id: po.id,
        driver_id: po.driver_id,
        driver_bank_account_id: po.driver_bank_account_id,
        amount: toNum(po.amount as unknown as string),
        currency: po.currency,
        status: po.status,
        period_start: po.period_start,
        period_end: po.period_end,
        failure_reason: po.failure_reason,
        created_at: po.created_at,
        updated_at: po.updated_at,
        driver: po.driver
          ? {
              id: po.driver.id,
              name: po.driver.name,
              mobile_number: po.driver.mobile_number,
            }
          : undefined,
        bank: po.driver_bank_account
          ? {
              id: po.driver_bank_account.id,
              bank_name: po.driver_bank_account.bank_name,
              account_number_last4:
                po.driver_bank_account.account_number?.slice(-4),
            }
          : undefined,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listPayoutsByDriver(driverId: string, query: PayoutListQueryDto) {
    const driverExists = await this.driverRepo.exists({
      where: { id: driverId },
    });
    if (!driverExists) {
      throw new NotFoundException('Driver not found');
    }

    const q = { ...query, status: query.status };
    const { page = 1, limit = 20, status, from, to } = q;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.driver_bank_account', 'ba')
      .where('po.driver_id = :driverId', { driverId })
      .orderBy('po.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('po.status = :status', { status });
    }
    if (from) {
      qb.andWhere('DATE(po.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(po.created_at) <= :to', { to });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      driver_id: driverId,
      data: rows.map((po) => ({
        id: po.id,
        amount: toNum(po.amount as unknown as string),
        currency: po.currency,
        status: po.status,
        period_start: po.period_start,
        period_end: po.period_end,
        failure_reason: po.failure_reason,
        created_at: po.created_at,
        bank: po.driver_bank_account
          ? {
              bank_name: po.driver_bank_account.bank_name,
              account_number_last4:
                po.driver_bank_account.account_number?.slice(-4),
            }
          : undefined,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async processWeeklyPayouts(
    adminId: string,
    dto: ProcessPayoutDto,
    ipAddress?: string,
  ) {
    const minBalance = dto.min_balance ?? 0.01;
    const periodStart = dto.period_start ? new Date(dto.period_start) : null;
    const periodEnd = dto.period_end ? new Date(dto.period_end) : null;

    let driverIds = dto.driver_ids;
    if (!driverIds?.length) {
      const wallets = await this.walletRepo
        .createQueryBuilder('w')
        .where('w.balance >= :min', { min: minBalance })
        .getMany();
      driverIds = wallets.map((w) => w.driver_id);
    }

    const payoutIds: string[] = [];
    const skipped: { driver_id: string; reason: string }[] = [];

    await this.dataSource.transaction(async (em) => {
      const walletRepo = em.getRepository(DriverWallet);
      const payoutTxRepo = em.getRepository(PayoutTransaction);
      const wtxRepo = em.getRepository(WalletTransaction);
      const bankRepo = em.getRepository(DriverBankAccount);
      const auditRepo = em.getRepository(AuditLog);

      for (const driverId of driverIds) {
        let wallet = await walletRepo.findOne({
          where: { driver_id: driverId },
        });
        if (!wallet) {
          wallet = walletRepo.create({
            driver_id: driverId,
            balance: 0,
            currency: 'INR',
          });
          await walletRepo.save(wallet);
        }

        const balance = toNum(wallet.balance as unknown as string);
        if (balance < minBalance) {
          skipped.push({ driver_id: driverId, reason: 'insufficient_balance' });
          continue;
        }

        const bank = await bankRepo.findOne({
          where: { driver_id: driverId },
          order: { created_at: 'ASC' },
        });
        if (!bank) {
          skipped.push({ driver_id: driverId, reason: 'no_bank_account' });
          continue;
        }

        const payout = new Payout();
        payout.driver_id = driverId;
        payout.driver_bank_account_id = bank.id;
        payout.amount = balance;
        payout.currency = wallet.currency || 'INR';
        payout.status = PayoutStatus.COMPLETED;
        payout.period_start = periodStart;
        payout.period_end = periodEnd;
        await em.save(payout);

        await payoutTxRepo.save(
          payoutTxRepo.create({
            payout_id: payout.id,
            step: 'ledger_completed',
            response: {
              method: 'internal_wallet_debit',
              note: 'Bank transfer via Razorpay Payouts / manual settlement is out of scope for this step; wallet debited in platform ledger.',
            },
          }),
        );

        const newBal = 0;
        await wtxRepo.save(
          wtxRepo.create({
            driver_id: driverId,
            transaction_type: WalletTransactionType.PAYOUT_DEBIT,
            amount: balance,
            payout_id: payout.id,
            balance_after: newBal,
            reference: 'admin_weekly_payout',
          }),
        );

        wallet.balance = newBal as unknown as number;
        await walletRepo.save(wallet);
        payoutIds.push(payout.id);
      }

      await auditRepo.insert({
        admin_id: adminId,
        action: 'PROCESS_DRIVER_PAYOUTS',
        entity_type: 'payouts',
        entity_id: payoutIds[0] ?? 'bulk',
        metadata: {
          payout_ids: payoutIds,
          skipped,
          period_start: dto.period_start,
          period_end: dto.period_end,
        },
        ip_address: ipAddress ?? undefined,
      });
    });

    return {
      processed_count: payoutIds.length,
      payout_ids: payoutIds,
      skipped,
      message:
        payoutIds.length > 0
          ? 'Payouts recorded and driver wallets debited (ledger).'
          : 'No payouts processed.',
    };
  }
}
