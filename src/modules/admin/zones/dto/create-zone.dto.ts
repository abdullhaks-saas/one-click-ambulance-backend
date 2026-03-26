import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
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

  @ApiPropertyOptional({
    description: 'Order of coordinate in polygon',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  sequence_order?: number;
}

export class CreateZoneDto {
  @ApiProperty({ description: 'Zone name', example: 'Central Bangalore' })
  @IsNotEmpty()
  @IsString()
  zone_name: string;

  @ApiPropertyOptional({ description: 'City name', example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Polygon coordinates defining zone boundary',
    type: [CoordinateDto],
    example: [
      { latitude: 12.9716, longitude: 77.5946 },
      { latitude: 12.9352, longitude: 77.6245 },
      { latitude: 12.906, longitude: 77.5859 },
      { latitude: 12.9716, longitude: 77.5946 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  coordinates: CoordinateDto[];
}
