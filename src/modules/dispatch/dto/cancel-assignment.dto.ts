import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CancelAssignmentDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  booking_id: string;
}
