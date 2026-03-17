import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ManualAssignDto {
  @ApiProperty({ description: 'Booking ID' })
  @IsUUID()
  booking_id: string;

  @ApiProperty({ description: 'Driver ID to assign' })
  @IsUUID()
  driver_id: string;
}
