import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class PaymentVerifyDto {
  @ApiProperty()
  @IsUUID()
  booking_id: string;

  @ApiProperty({ description: 'Razorpay order_id' })
  @IsString()
  razorpay_order_id: string;

  @ApiProperty()
  @IsString()
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  razorpay_signature: string;
}
