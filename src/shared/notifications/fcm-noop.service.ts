import { Injectable } from '@nestjs/common';
import {
  IFcmNotificationService,
  FcmPayload,
} from './interfaces/fcm-notification.interface';

/**
 * No-op FCM service. Replace with Firebase Admin SDK implementation when FCM module is ready.
 */
@Injectable()
export class FcmNoopService implements IFcmNotificationService {
  async sendToToken(_token: string, _payload: FcmPayload): Promise<boolean> {
    return true;
  }
}
