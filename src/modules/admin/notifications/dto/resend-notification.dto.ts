import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ResendNotificationDto {
  @ApiProperty()
  @IsUUID()
  log_id: string;
}
