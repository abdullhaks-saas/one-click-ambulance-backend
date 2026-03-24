import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RetryFailedPaymentDto {
  @ApiProperty({ description: 'Internal payment row id' })
  @IsUUID()
  payment_id: string;
}
