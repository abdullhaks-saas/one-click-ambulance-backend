import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignDriverDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  booking_id: string;
}
