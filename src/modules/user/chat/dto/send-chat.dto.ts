import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SendChatDto {
  @ApiProperty()
  @IsUUID()
  booking_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}
