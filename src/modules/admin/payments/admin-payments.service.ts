import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
} from '../../../database/entities/payment.entity';
import {
  PaymentTransaction,
  PaymentTransactionKind,
} from '../../../database/entities/payment-transaction.entity';
import {
  WalletTransaction,
  WalletTransactionType,
} from '../../../database/entities/wallet-transaction.entity';
import { RazorpayService } from '../../../shared/razorpay/razorpay.service';
import type { RazorpayPaymentFetchResponse } from '../../../shared/razorpay/razorpay.service';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { CommissionQueryDto } from './dto/commission-query.dto';

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(v);
}

function mapRazorpayStatusToLocal(rz: string): PaymentStatus | string {
  switch (rz) {
    case 'captured':
      return PaymentStatus.SUCCESS;
    case 'authorized':
      return PaymentStatus.PENDING;
    case 'failed':
      return PaymentStatus.FAILED;
    case 'refunded':
      return PaymentStatus.REFUNDED;
    default:
      return PaymentStatus.PENDING;
  }
}

@Injectable()
export class AdminPaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    @InjectRepository(WalletTransaction)
    private readonly walletTxRepo: Repository<WalletTransaction>,
    private readonly razorpayService: RazorpayService,
  ) {}

  async listPayments(query: PaymentListQueryDto) {
    const { page = 1, limit = 20, status, from, to, search } = query;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('p.booking', 'b')
      .orderBy('p.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('p.status = :status', { status });
    }
    if (from) {
      qb.andWhere('DATE(p.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(p.created_at) <= :to', { to });
    }
    if (search) {
      qb.andWhere(
        '(u.mobile_number LIKE :search OR u.name LIKE :search OR p.razorpay_payment_id LIKE :search OR p.razorpay_order_id LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    const paymentIds = rows.map((r) => r.id);
    const txCounts: Record<string, number> = {};
    if (paymentIds.length > 0) {
      const raw = await this.paymentTxRepo
        .createQueryBuilder('pt')
        .select('pt.payment_id', 'payment_id')
        .addSelect('COUNT(pt.id)', 'cnt')
        .where('pt.payment_id IN (:...ids)', { ids: paymentIds })
        .groupBy('pt.payment_id')
        .getRawMany<{ payment_id: string; cnt: string }>();
      for (const r of raw) {
        txCounts[r.payment_id] = parseInt(r.cnt, 10);
      }
    }

    return {
      data: rows.map((p) => ({
        id: p.id,
        booking_id: p.booking_id,
        user_id: p.user_id,
        amount: toNum(p.amount as unknown as string),
        razorpay_order_id: p.razorpay_order_id,
        razorpay_payment_id: p.razorpay_payment_id,
        payment_method: p.payment_method,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        transaction_count: txCounts[p.id] ?? 0,
        user: p.user
          ? {
              id: p.user.id,
              name: p.user.name,
              mobile_number: p.user.mobile_number,
            }
          : undefined,
        booking: p.booking
          ? { id: p.booking.id, status: p.booking.status }
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

  async listFailedTransactions(query: PaymentListQueryDto) {
    const { page = 1, limit = 20, from, to, search, status } = query;
    const skip = (page - 1) * limit;

    const st =
      status === 'failed' || status === 'pending'
        ? [status]
        : (['failed', 'pending'] as const);

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .where('p.status IN (:...st)', { st: [...st] })
      .orderBy('p.updated_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (from) {
      qb.andWhere('DATE(p.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(p.created_at) <= :to', { to });
    }
    if (search) {
      qb.andWhere(
        '(u.mobile_number LIKE :search OR u.name LIKE :search OR p.razorpay_payment_id LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((p) => ({
        id: p.id,
        booking_id: p.booking_id,
        user_id: p.user_id,
        amount: toNum(p.amount as unknown as string),
        razorpay_payment_id: p.razorpay_payment_id,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        user: p.user
          ? {
              id: p.user.id,
              name: p.user.name,
              mobile_number: p.user.mobile_number,
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

  async retryFailedPayment(paymentId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (!payment.razorpay_payment_id) {
      throw new BadRequestException(
        'Payment has no razorpay_payment_id; cannot sync with Razorpay',
      );
    }

    try {
      const rzp = await this.razorpayService.fetchPayment(
        payment.razorpay_payment_id,
      );
      this.applyRazorpayToPayment(payment, rzp);
      await this.paymentRepo.save(payment);
      await this.paymentTxRepo.save(
        this.paymentTxRepo.create({
          payment_id: payment.id,
          kind: PaymentTransactionKind.RETRY_STATUS,
          razorpay_payment_id: rzp.id,
          remote_status: rzp.status,
          payload: rzp as unknown as Record<string, unknown>,
        }),
      );
      return {
        payment_id: payment.id,
        local_status: payment.status,
        razorpay_status: rzp.status,
        message: 'Payment status refreshed from Razorpay',
      };
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : String(err);
      await this.paymentTxRepo.save(
        this.paymentTxRepo.create({
          payment_id: payment.id,
          kind: PaymentTransactionKind.RETRY_STATUS,
          razorpay_payment_id: payment.razorpay_payment_id,
          error_message: msg,
        }),
      );
      throw new BadGatewayException(`Razorpay request failed: ${msg}`);
    }
  }

  async getReconciliation() {
    const statusRows = await this.paymentRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(p.id)', 'cnt')
      .addSelect('COALESCE(SUM(p.amount),0)', 'total_amount')
      .groupBy('p.status')
      .getRawMany<{ status: string; cnt: string; total_amount: string }>();

    const payments_by_status: Record<
      string,
      { count: number; amount: number }
    > = {};
    for (const r of statusRows) {
      payments_by_status[r.status] = {
        count: parseInt(r.cnt, 10),
        amount: toNum(r.total_amount),
      };
    }

    const commissionRow = await this.walletTxRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount),0)', 'total')
      .where('w.transaction_type = :t', {
        t: WalletTransactionType.DRIVER_COMMISSION_CREDIT,
      })
      .getRawOne<{ total: string }>();

    const payoutDebitRow = await this.walletTxRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount),0)', 'total')
      .where('w.transaction_type = :t', {
        t: WalletTransactionType.PAYOUT_DEBIT,
      })
      .getRawOne<{ total: string }>();

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 1);
    const stalePending = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.status = :st', { st: PaymentStatus.PENDING })
      .andWhere('p.razorpay_payment_id IS NOT NULL')
      .andWhere('p.updated_at < :cutoff', { cutoff })
      .getCount();

    return {
      payments_by_status,
      wallet_ledger: {
        total_driver_commission_credited: toNum(commissionRow?.total),
        total_payout_debited: toNum(payoutDebitRow?.total),
      },
      flags: {
        pending_with_razorpay_id_older_than_24h: stalePending,
      },
    };
  }

  async reconcilePaymentTransaction(paymentTransactionId: string) {
    const pt = await this.paymentTxRepo.findOne({
      where: { id: paymentTransactionId },
      relations: ['payment'],
    });
    if (!pt || !pt.payment) {
      throw new NotFoundException('Payment transaction not found');
    }
    const payment = pt.payment;
    if (!payment.razorpay_payment_id) {
      throw new BadRequestException(
        'Linked payment has no razorpay_payment_id',
      );
    }

    try {
      const rzp = await this.razorpayService.fetchPayment(
        payment.razorpay_payment_id,
      );
      this.applyRazorpayToPayment(payment, rzp);
      await this.paymentRepo.save(payment);
      const row = await this.paymentTxRepo.save(
        this.paymentTxRepo.create({
          payment_id: payment.id,
          kind: PaymentTransactionKind.RECONCILE,
          razorpay_payment_id: rzp.id,
          remote_status: rzp.status,
          payload: rzp as unknown as Record<string, unknown>,
        }),
      );
      return {
        payment_transaction_id: row.id,
        reference_payment_transaction_id: pt.id,
        payment_id: payment.id,
        local_status: payment.status,
        razorpay_status: rzp.status,
        message: 'Reconciled with Razorpay',
      };
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : String(err);
      await this.paymentTxRepo.save(
        this.paymentTxRepo.create({
          payment_id: payment.id,
          kind: PaymentTransactionKind.RECONCILE,
          razorpay_payment_id: payment.razorpay_payment_id,
          error_message: msg,
        }),
      );
      throw new BadGatewayException(`Razorpay request failed: ${msg}`);
    }
  }

  async getDriverCommission(query: CommissionQueryDto) {
    const { from, to } = query;
    const qb = this.walletTxRepo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.driver', 'd')
      .where('w.transaction_type = :t', {
        t: WalletTransactionType.DRIVER_COMMISSION_CREDIT,
      })
      .orderBy('d.name', 'ASC');

    if (from) {
      qb.andWhere('DATE(w.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(w.created_at) <= :to', { to });
    }

    const rows = await qb.getMany();
    const byDriver: Record<
      string,
      {
        driver_id: string;
        driver_name: string | null;
        mobile_number: string;
        total_commission: number;
        transaction_count: number;
      }
    > = {};

    for (const w of rows) {
      const id = w.driver_id;
      if (!byDriver[id]) {
        byDriver[id] = {
          driver_id: id,
          driver_name: w.driver?.name ?? null,
          mobile_number: w.driver?.mobile_number ?? '',
          total_commission: 0,
          transaction_count: 0,
        };
      }
      byDriver[id].total_commission += toNum(w.amount as unknown as string);
      byDriver[id].transaction_count += 1;
    }

    return { drivers: Object.values(byDriver) };
  }

  async getPlatformRevenue(query: CommissionQueryDto) {
    const { from, to } = query;
    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount),0)', 'gross')
      .where('p.status = :st', { st: PaymentStatus.SUCCESS });

    if (from) {
      qb.andWhere('DATE(p.created_at) >= :from', { from });
    }
    if (to) {
      qb.andWhere('DATE(p.created_at) <= :to', { to });
    }

    const grossRow = await qb.getRawOne<{ gross: string }>();
    const gross = toNum(grossRow?.gross);

    const wqb = this.walletTxRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.amount),0)', 'total')
      .where('w.transaction_type = :t', {
        t: WalletTransactionType.DRIVER_COMMISSION_CREDIT,
      });
    if (from) {
      wqb.andWhere('DATE(w.created_at) >= :from', { from });
    }
    if (to) {
      wqb.andWhere('DATE(w.created_at) <= :to', { to });
    }
    const commRow = await wqb.getRawOne<{ total: string }>();
    const commission = toNum(commRow?.total);

    return {
      gross_revenue_from_online_payments: gross,
      total_driver_commission_credited: commission,
      net_platform_estimate: Math.max(0, gross - commission),
      note: 'net_platform_estimate is simplified (successful online payments minus driver commission credits in wallet ledger).',
    };
  }

  private applyRazorpayToPayment(
    payment: Payment,
    rzp: RazorpayPaymentFetchResponse,
  ) {
    payment.status = mapRazorpayStatusToLocal(rzp.status) as PaymentStatus;
    payment.razorpay_payment_id = rzp.id;
    if (rzp.order_id) {
      payment.razorpay_order_id = rzp.order_id;
    }
  }
}
