import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AnalyticsQueryDto } from './analytics-query.dto';

export class DailyRidesQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({
    description:
      'If set, only this calendar day is returned (overrides from/to)',
  })
  @IsOptional()
  @IsString()
  date?: string;
}
