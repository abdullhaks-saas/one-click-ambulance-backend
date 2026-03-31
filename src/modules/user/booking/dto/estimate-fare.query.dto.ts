import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class EstimateFareQueryDto {
  @ApiProperty()
  @IsUUID()
  ambulance_type_id: string;

  @ApiPropertyOptional({ description: 'Pickup latitude (required unless distance_km is sent)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickup_latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickup_longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  drop_latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  drop_longitude?: number;

  @ApiPropertyOptional({
    description:
      'Route distance in km from client Maps (skips server distance lookup when all four coords omitted)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance_km?: number;

  @ApiPropertyOptional({
    description: 'Route duration in minutes (optional when distance_km is from client)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration_minutes?: number;

  @ApiPropertyOptional({
    description:
      'ISO 8601 datetime for night-surcharge evaluation (Asia/Kolkata). Defaults to now.',
    example: '2026-03-30T23:00:00+05:30',
  })
  @IsOptional()
  @IsDateString()
  at?: string;

  @ApiPropertyOptional({
    description: 'When true, adds emergency_charge from pricing_rules to the estimate',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  include_emergency?: boolean;
}
