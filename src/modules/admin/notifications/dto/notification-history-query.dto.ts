import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../common/dto/pagination.dto';

export class NotificationHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['campaign', 'delivery'],
    default: 'campaign',
    description:
      'campaign: one row per send; delivery: one row per device (for drill-down / resend)',
  })
  @IsOptional()
  @IsIn(['campaign', 'delivery'])
  group_by?: 'campaign' | 'delivery';

  @ApiPropertyOptional({
    description: 'When group_by=delivery, filter logs to this notification (campaign) id',
  })
  @IsOptional()
  @IsUUID('4')
  notification_id?: string;

  @ApiPropertyOptional({ enum: ['sent', 'failed'] })
  @IsOptional()
  @IsString()
  @IsIn(['sent', 'failed'])
  status?: 'sent' | 'failed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
