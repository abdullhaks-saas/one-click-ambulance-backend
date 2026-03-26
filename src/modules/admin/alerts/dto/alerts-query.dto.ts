import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdminAlertType, AdminAlertSeverity } from '../../../../database/entities/admin-alert.entity';

export class AlertsQueryDto {
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

  @ApiPropertyOptional({ enum: AdminAlertType })
  @IsOptional()
  @IsEnum(AdminAlertType)
  type?: AdminAlertType;

  @ApiPropertyOptional({ enum: AdminAlertSeverity })
  @IsOptional()
  @IsEnum(AdminAlertSeverity)
  severity?: AdminAlertSeverity;

  @ApiPropertyOptional({ description: 'Show only unread' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread_only?: boolean;
}
