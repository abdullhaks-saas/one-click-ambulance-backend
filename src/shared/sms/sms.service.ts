import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '../http/http.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly msg91AuthKey: string | undefined;
  private readonly msg91TemplateId: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.msg91AuthKey = this.configService.get('MSG91_AUTH_KEY');
    this.msg91TemplateId = this.configService.get('MSG91_TEMPLATE_ID');
  }

  async sendOtp(mobileNumber: string, otp: string): Promise<void> {
    if (!this.msg91AuthKey || !this.msg91TemplateId) {
      this.logger.warn(
        'MSG91 not configured - skipping SMS. OTP for dev: ' + otp,
      );
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    const url = 'https://control.msg91.com/api/v5/flow/';

    try {
      await this.httpService.post(
        url,
        {
          template_id: this.msg91TemplateId,
          short_url: '0',
          recipients: [
            {
              mobiles: `91${cleanMobile}`,
              otp,
            },
          ],
        },
        {
          headers: {
            authkey: this.msg91AuthKey,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      this.logger.error('MSG91 OTP send failed:', error);
      throw error;
    }
  }
}
