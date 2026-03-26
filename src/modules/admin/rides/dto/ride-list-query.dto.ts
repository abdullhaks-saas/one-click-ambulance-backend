import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { RideStatusEnum } from '../../../../database/entities/ride-status.entity';

export class RideListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: RideStatusEnum,
    description:
      'Filter by ride status (accepted, arrived, patient_onboard, trip_started, trip_completed)',
  })
  @IsOptional()
  status?: RideStatusEnum | string;

  @ApiPropertyOptional({ description: 'From date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by booking ID' })
  @IsOptional()
  @IsUUID()
  booking_id?: string;

  @ApiPropertyOptional({ description: 'Search by user mobile or driver name' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by booking service zone' })
  @IsOptional()
  @IsUUID()
  zone_id?: string;
}
