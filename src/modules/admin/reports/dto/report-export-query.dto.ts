import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ReportExportQueryDto {
  @ApiProperty({
    enum: ['rides', 'revenue', 'drivers', 'payments', 'cancellations'],
  })
  @IsString()
  @IsIn(['rides', 'revenue', 'drivers', 'payments', 'cancellations'])
  report: 'rides' | 'revenue' | 'drivers' | 'payments' | 'cancellations';

  @ApiProperty({ enum: ['csv', 'xlsx'] })
  @IsString()
  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  zone_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
