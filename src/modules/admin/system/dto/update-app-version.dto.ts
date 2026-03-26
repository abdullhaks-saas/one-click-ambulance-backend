import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAppVersionDto {
  @ApiProperty({ enum: ['ios', 'android'] })
  @IsString()
  @IsIn(['ios', 'android'])
  platform: 'ios' | 'android';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  build_number?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  release_notes?: string;
}
