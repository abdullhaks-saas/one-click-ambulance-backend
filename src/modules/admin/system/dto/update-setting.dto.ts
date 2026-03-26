import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  key: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  value: string;
}
