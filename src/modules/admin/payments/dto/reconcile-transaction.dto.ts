import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReconcileTransactionDto {
  @ApiProperty({ description: 'payment_transactions.id' })
  @IsUUID()
  payment_transaction_id: string;
}
