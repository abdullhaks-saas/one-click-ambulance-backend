import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinateDto {
  @ApiProperty({ description: 'Latitude', example: 12.9716 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 77.5946 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Order of coordinate in polygon' })
  @IsOptional()
  @IsNumber()
  sequence_order?: number;
}

export class UpdateZoneDto {
  @ApiPropertyOptional({
    description: 'Zone name',
    example: 'Central Bangalore',
  })
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
  coordinates?: CoordinateDto[];
}
