import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserListQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by blocked status',
    enum: ['all', 'blocked', 'active'],
  })
  @IsOptional()
  @IsIn(['all', 'blocked', 'active'])
  status?: 'all' | 'blocked' | 'active' = 'all';

  @ApiPropertyOptional({ description: 'Search by name, mobile or email' })
  @IsOptional()
  @IsString()
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
