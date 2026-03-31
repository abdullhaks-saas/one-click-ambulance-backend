import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ChatMessagesQueryDto {
  @ApiProperty()
  @IsUUID()
  booking_id: string;
}
