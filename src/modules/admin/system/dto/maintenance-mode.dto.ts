import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class MaintenanceModeDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
