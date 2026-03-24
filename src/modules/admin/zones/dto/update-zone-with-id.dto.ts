import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CoordinateDto } from './update-zone.dto';

/**
 * DTO for PUT /admin/zones/update (plan #33).
 * zone_id in body specifies which zone to update.
 */
export class UpdateZoneWithIdDto {
  @ApiProperty({ description: 'Zone UUID to update' })
  @IsNotEmpty()
  @IsUUID()
  zone_id: string;

  @ApiPropertyOptional({ description: 'Zone name', example: 'Central Bangalore' })
  @IsOptional()
  @IsString()
  zone_name?: string;

  @ApiPropertyOptional({ description: 'City name', example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Polygon coordinates defining zone boundary',
    type: [CoordinateDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates?: { latitude: number; longitude: number; sequence_order?: number }[];
}
