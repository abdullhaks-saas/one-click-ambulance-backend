import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RatingsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by driver UUID' })
  @IsOptional()
  @IsUUID()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'Max rating to filter (e.g. 3 = show 1-3 star)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  max_rating?: number;

  @ApiPropertyOptional({ description: 'Min rating to filter' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  min_rating?: number;

  @ApiPropertyOptional({ description: 'Start date (ISO)' })
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (ISO)' })
  @IsOptional()
  to?: string;
}
