import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../common/dto/pagination.dto';
import { AmbulanceStatus } from '../../../../database/entities/ambulance.entity';

export class AmbulanceListQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AmbulanceStatus })
  @IsOptional()
  status?: AmbulanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ambulance_type_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  driver_id?: string;

  @ApiPropertyOptional({ description: 'Search by registration or vehicle number' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;
}
