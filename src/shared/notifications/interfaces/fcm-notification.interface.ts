/** Injection token for FCM service (interfaces don't exist at runtime) */
export const FCM_NOTIFICATION_SERVICE = Symbol('FCM_NOTIFICATION_SERVICE');

/**
 * Interface for FCM push notifications.
 * Implement with Firebase Admin SDK when FCM module is available.
 */
export interface IFcmNotificationService {
  sendToToken(token: string, payload: FcmPayload): Promise<boolean>;
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Rich notification image (FCM `notification.imageUrl` when using Firebase Admin). */
  imageUrl?: string;
}
