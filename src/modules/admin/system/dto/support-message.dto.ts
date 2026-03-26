import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class SupportMessageDto {
  @ApiProperty()
  @IsUUID()
  ticket_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body: string;
}
