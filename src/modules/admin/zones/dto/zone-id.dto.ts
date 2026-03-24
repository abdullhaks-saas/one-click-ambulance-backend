import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ZoneIdDto {
  @ApiProperty({ description: 'Zone UUID' })
  @IsNotEmpty()
  @IsUUID()
  zone_id: string;
}
