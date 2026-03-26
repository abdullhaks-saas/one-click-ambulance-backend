import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { DriverStatus } from '../../../../database/entities/driver.entity';

export class DriverListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: DriverStatus })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional({ description: 'Search name, mobile, or email' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;

  @ApiPropertyOptional({ description: 'Registered on/after (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Registered on/before (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  to?: string;
}
