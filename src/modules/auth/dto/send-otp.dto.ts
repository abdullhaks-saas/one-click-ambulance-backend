import { IsMobilePhone, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  mobile_number: string;

  @ApiProperty({ enum: [Role.USER, Role.DRIVER], example: Role.USER })
  @IsEnum([Role.USER, Role.DRIVER])
  role: Role.USER | Role.DRIVER;
}
