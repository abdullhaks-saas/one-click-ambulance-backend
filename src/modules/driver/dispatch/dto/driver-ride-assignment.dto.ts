import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class DriverRideAssignmentDto {
  @ApiProperty({ description: 'Active ride offer row from FCM payload' })
  @IsUUID()
  assignment_id: string;
}

export class DriverRideRejectDto extends DriverRideAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejection_reason?: string;
}
