import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class NotifyUsersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  user_ids: string[];

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Optional image URL for rich notifications (stored in notification data)',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  @MaxLength(2048)
  image_url?: string;
}
