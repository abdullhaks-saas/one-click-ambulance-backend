import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Phase 8: POST /fraud/flag-driver — targets `drivers` fraud columns + `audit_logs`. */
export class FlagDriverRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  driver_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
