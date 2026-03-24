import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class ProcessPayoutDto {
  @ApiPropertyOptional({
    description: 'If empty, all drivers with wallet balance above min_balance',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  driver_ids?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period_start?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  period_end?: string;

  @ApiPropertyOptional({ default: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_balance?: number;
}
