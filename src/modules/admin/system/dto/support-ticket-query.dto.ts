import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class SupportTicketQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['open', 'in_progress', 'closed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by subject (partial match)' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  search?: string;
}
