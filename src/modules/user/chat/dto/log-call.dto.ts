import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class LogCallDto {
  @ApiProperty()
  @IsUUID()
  booking_id: string;

  @ApiProperty({ description: 'e.g. user | driver role or phone label' })
  @IsString()
  @MaxLength(50)
  caller: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  receiver: string;

  @ApiPropertyOptional({ description: 'Seconds, if known' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  call_duration?: number;
}
