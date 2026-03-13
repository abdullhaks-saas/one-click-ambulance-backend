import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class DriverIdDto {
  @ApiProperty({ description: 'Driver UUID' })
  @IsNotEmpty()
  @IsUUID()
  driver_id: string;
}

export class RejectDriverDto extends DriverIdDto {
  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  reason?: string;
}
