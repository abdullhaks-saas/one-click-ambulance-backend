import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class RideBookingIdQueryDto {
  @ApiProperty({ description: 'Booking UUID' })
  @IsUUID()
  booking_id: string;
}
