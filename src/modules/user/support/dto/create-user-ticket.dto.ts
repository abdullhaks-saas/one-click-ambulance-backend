import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(8000)
  description: string;
}
