import { IsMobilePhone } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  mobile_number: string;
}
