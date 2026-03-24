import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignDriverDto {
  @ApiProperty({ description: 'Driver UUID to assign to zone' })
  @IsNotEmpty()
  @IsUUID()
  driver_id: string;
}
