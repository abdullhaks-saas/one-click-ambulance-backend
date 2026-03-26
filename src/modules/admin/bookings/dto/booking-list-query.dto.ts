import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { BookingStatus } from '../../../../database/entities/booking.entity';

export class BookingListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: BookingStatus,
    description: 'Filter by booking status',
  })
  @IsOptional()
  status?: BookingStatus | string;

  @ApiPropertyOptional({ description: 'From date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'To date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by zone ID' })
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @ApiPropertyOptional({ description: 'Search by user mobile or name' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;
}
