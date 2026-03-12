import { IsString, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  mobile_number: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ enum: [Role.USER, Role.DRIVER] })
  @IsEnum([Role.USER, Role.DRIVER])
  role: Role.USER | Role.DRIVER;
}
