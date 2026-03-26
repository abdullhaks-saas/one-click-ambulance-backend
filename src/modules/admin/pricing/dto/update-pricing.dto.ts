import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePricingDto {
  @ApiProperty({ description: 'Ambulance type UUID' })
  @IsNotEmpty()
  @IsUUID()
  ambulance_type_id: string;

  @ApiPropertyOptional({ description: 'Base fare (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  base_fare?: number;

  @ApiPropertyOptional({ description: 'Per kilometer price (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  per_km_price?: number;

  @ApiPropertyOptional({ description: 'Emergency surcharge (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  emergency_charge?: number;

  @ApiPropertyOptional({ description: 'Night charge (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  night_charge?: number;

  @ApiPropertyOptional({ description: 'Minimum fare (₹)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimum_fare?: number;
}
