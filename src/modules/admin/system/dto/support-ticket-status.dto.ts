import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class SupportTicketStatusDto {
  @ApiProperty({ enum: ['open', 'in_progress', 'closed'] })
  @IsString()
  @IsIn(['open', 'in_progress', 'closed'])
  status: 'open' | 'in_progress' | 'closed';
}
