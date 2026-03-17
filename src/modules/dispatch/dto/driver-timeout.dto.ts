import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class DriverTimeoutDto {
  @ApiProperty({ description: 'Booking driver assignment ID' })
  @IsUUID()
  assignment_id: string;
}
