import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { PaymentTransaction } from '../../../database/entities/payment-transaction.entity';
import { RazorpayModule } from '../../../shared/razorpay/razorpay.module';
import { UserPaymentController } from './user-payment.controller';
import { UserPaymentService } from './user-payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, PaymentTransaction]),
    RazorpayModule,
  ],
  controllers: [UserPaymentController],
  providers: [UserPaymentService],
})
export class UserPaymentModule {}
