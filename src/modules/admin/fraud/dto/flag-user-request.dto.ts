import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Phase 8: POST /fraud/flag-user — targets `users` fraud columns + `audit_logs`. */
export class FlagUserRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
