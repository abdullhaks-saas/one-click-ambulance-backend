import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ForceCancelRideDto {
  @ApiProperty({ description: 'Booking ID to force cancel' })
  @IsUUID()
  booking_id: string;

  @ApiPropertyOptional({ description: 'Reason for force cancellation', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
