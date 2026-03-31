import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
} from '../../../database/entities/booking.entity';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '../../../database/entities/payment.entity';
import {
  PaymentTransaction,
  PaymentTransactionKind,
} from '../../../database/entities/payment-transaction.entity';
import { RazorpayService } from '../../../shared/razorpay/razorpay.service';
import { PaymentInitiateDto } from './dto/payment-initiate.dto';
import { PaymentVerifyDto } from './dto/payment-verify.dto';
import { PaymentHistoryQueryDto } from './dto/payment-history.query.dto';

function rupeesToPaise(rupees: number): number {
  return Math.round(Number(rupees) * 100);
}

function mapRzStatus(status: string): PaymentStatus | string {
  switch (status) {
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
export class UserPaymentService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
  ) {}

  private getKeyId(): string {
    const keyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      this.configService.get<string>('RAZORPAY_ID');
    if (!keyId) {
      throw new BadRequestException(
        'Payment gateway is not configured (RAZORPAY_KEY_ID)',
      );
    }
    return keyId;
  }

  private verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const secret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      this.configService.get<string>('RAZORPAY_SECRET');
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  private fareRupees(booking: Booking): number {
    if (booking.final_fare != null && Number(booking.final_fare) > 0) {
      return Number(booking.final_fare);
    }
    if (booking.estimated_fare != null && Number(booking.estimated_fare) > 0) {
      return Number(booking.estimated_fare);
    }
    throw new BadRequestException('Booking has no fare to charge');
  }

  async initiate(userId: string, dto: PaymentInitiateDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id: dto.booking_id, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== BookingStatus.TRIP_COMPLETED) {
      throw new BadRequestException(
        'Payment is only available after the trip is completed',
      );
    }

    const success = await this.paymentRepo.findOne({
      where: {
        booking_id: dto.booking_id,
        user_id: userId,
        status: PaymentStatus.SUCCESS,
      },
    });
    if (success) {
      throw new BadRequestException('This ride is already paid');
    }

    const amountRupees = this.fareRupees(booking);
    const amountPaise = rupeesToPaise(amountRupees);

    const pending = await this.paymentRepo.findOne({
      where: {
        booking_id: dto.booking_id,
        user_id: userId,
        status: PaymentStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    });

    if (pending?.razorpay_order_id) {
      return {
        key_id: this.getKeyId(),
        order_id: pending.razorpay_order_id,
        amount_paise: amountPaise,
        currency: 'INR',
        payment_id: pending.id,
        booking_id: booking.id,
      };
    }

    const order = await this.razorpayService.createOrder(
      amountPaise,
      booking.id,
      { booking_id: booking.id, user_id: userId },
    );

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        booking_id: booking.id,
        user_id: userId,
        amount: amountRupees,
        razorpay_order_id: order.id,
        payment_method: PaymentMethod.ONLINE,
        status: PaymentStatus.PENDING,
      }),
    );

    return {
      key_id: this.getKeyId(),
      order_id: order.id,
      amount_paise: order.amount,
      currency: order.currency,
      payment_id: payment.id,
      booking_id: booking.id,
    };
  }

  async verify(userId: string, dto: PaymentVerifyDto) {
    if (
      !this.verifySignature(
        dto.razorpay_order_id,
        dto.razorpay_payment_id,
        dto.razorpay_signature,
      )
    ) {
      throw new BadRequestException('Invalid payment signature');
    }

    const booking = await this.bookingRepo.findOne({
      where: { id: dto.booking_id, user_id: userId },
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    let payment = await this.paymentRepo.findOne({
      where: {
        booking_id: dto.booking_id,
        user_id: userId,
        razorpay_order_id: dto.razorpay_order_id,
      },
    });

    if (!payment) {
      payment = await this.paymentRepo.save(
        this.paymentRepo.create({
          booking_id: dto.booking_id,
          user_id: userId,
          amount: this.fareRupees(booking),
          razorpay_order_id: dto.razorpay_order_id,
          payment_method: PaymentMethod.ONLINE,
          status: PaymentStatus.PENDING,
        }),
      );
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        status: PaymentStatus.SUCCESS,
        payment_id: payment.id,
        booking_id: dto.booking_id,
        already_verified: true,
      };
    }

    const remote = await this.razorpayService.fetchPayment(
      dto.razorpay_payment_id,
    );

    if (remote.order_id && remote.order_id !== dto.razorpay_order_id) {
      throw new BadRequestException('Payment does not match this order');
    }

    payment.razorpay_payment_id = remote.id;
    payment.payment_method = remote.method ?? payment.payment_method;
    payment.status = mapRzStatus(remote.status) as PaymentStatus;

    await this.paymentRepo.save(payment);

    await this.paymentTxRepo.save(
      this.paymentTxRepo.create({
        payment_id: payment.id,
        kind: PaymentTransactionKind.VERIFY,
        razorpay_payment_id: remote.id,
        remote_status: remote.status,
        payload: { remote, verify: dto } as unknown as Record<string, unknown>,
      }),
    );

    return {
      status: payment.status,
      payment_id: payment.id,
      booking_id: dto.booking_id,
      razorpay_payment_id: remote.id,
    };
  }

  async history(userId: string, query: PaymentHistoryQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await this.paymentRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip,
      take: limit,
      relations: { booking: { ambulance_type: true } },
    });

    return {
      data: rows.map((p) => ({
        id: p.id,
        booking_id: p.booking_id,
        amount: Number(p.amount),
        status: p.status,
        payment_method: p.payment_method,
        razorpay_order_id: p.razorpay_order_id,
        razorpay_payment_id: p.razorpay_payment_id,
        created_at: p.created_at,
        booking_status: p.booking?.status ?? null,
        ambulance_type: p.booking?.ambulance_type?.name ?? null,
      })),
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit) || 0,
      },
    };
  }
}
