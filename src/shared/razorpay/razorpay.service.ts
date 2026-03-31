import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '../http/http.service';

/** Shape of Razorpay GET /v1/payments/:id (subset). @see https://razorpay.com/docs/api/payments/fetch-with-id/ */
export interface RazorpayPaymentFetchResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id?: string;
  method?: string;
  error_code?: string;
  error_description?: string;
}

/** POST /v1/orders response (subset). */
export interface RazorpayOrderCreateResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private getAuthHeader(): string {
    const keyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      this.configService.get<string>('RAZORPAY_ID');
    const keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      this.configService.get<string>('RAZORPAY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)',
      );
    }
    const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    return `Basic ${token}`;
  }

  /**
   * Create a Razorpay order (amount in smallest currency unit — paise for INR).
   */
  async createOrder(
    amountPaise: number,
    receipt: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrderCreateResponse> {
    const url = `${this.baseUrl}/orders`;
    const safeReceipt = receipt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    const { data } = await this.httpService.post<RazorpayOrderCreateResponse>(
      url,
      {
        amount: Math.round(amountPaise),
        currency: 'INR',
        receipt: safeReceipt || 'rcp',
        notes: notes ?? {},
      },
      {
        headers: { Authorization: this.getAuthHeader() },
      },
    );
    return data;
  }

  async fetchPayment(
    razorpayPaymentId: string,
  ): Promise<RazorpayPaymentFetchResponse> {
    const url = `${this.baseUrl}/payments/${encodeURIComponent(razorpayPaymentId)}`;
    try {
      const { data } = await this.httpService.get<RazorpayPaymentFetchResponse>(
        url,
        {
          headers: { Authorization: this.getAuthHeader() },
        },
      );
      return data;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      this.logger.warn(
        `Razorpay fetchPayment failed: ${e.status} ${e.message}`,
      );
      throw err;
    }
  }
}
