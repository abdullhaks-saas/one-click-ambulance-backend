import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AmbulanceIdDto {
  @ApiProperty({ description: 'Ambulance UUID' })
  @IsNotEmpty()
  @IsUUID()
  ambulance_id: string;
}

export class SuspendAmbulanceDto extends AmbulanceIdDto {
  @ApiPropertyOptional({ description: 'Extended reason for suspension' })
  @IsOptional()
  @IsString()
  reason?: string;
}
