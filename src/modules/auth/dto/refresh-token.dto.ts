import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
