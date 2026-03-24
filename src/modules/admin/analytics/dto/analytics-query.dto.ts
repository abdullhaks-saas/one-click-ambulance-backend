import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

/** Phase 7.2 — shared query pattern: ?from=&to=&zone_id=&ambulance_type_id= */
export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'YYYY-MM-DD (defaults with `to`)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD (defaults to today)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ambulance_type_id?: string;
}
