import { Module } from '@nestjs/common';
import { UserAuthModule } from './auth/user-auth.module';
import { UserProfileModule } from './profile/user-profile.module';
import { UserAddressModule } from './addresses/user-address.module';
import { UserAmbulanceModule } from './ambulance/user-ambulance.module';
import { UserBookingModule } from './booking/user-booking.module';
import { UserRideModule } from './ride/user-ride.module';
import { UserPaymentModule } from './payment/user-payment.module';
import { UserRatingModule } from './rating/user-rating.module';
import { UserNotificationsModule } from './notifications/user-notifications.module';
import { UserChatModule } from './chat/user-chat.module';
import { UserInvoiceModule } from './invoice/user-invoice.module';
import { UserSupportModule } from './support/user-support.module';
import { UserPublicModule } from './public/user-public.module';

@Module({
  imports: [
    UserAuthModule,
    UserProfileModule,
    UserAddressModule,
    UserAmbulanceModule,
    UserBookingModule,
    UserRideModule,
    UserPaymentModule,
    UserRatingModule,
    UserNotificationsModule,
    UserChatModule,
    UserInvoiceModule,
    UserSupportModule,
    UserPublicModule,
  ],
})
export class UserModule {}
