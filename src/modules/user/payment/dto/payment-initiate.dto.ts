import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PaymentInitiateDto {
  @ApiProperty()
  @IsUUID()
  booking_id: string;
}
