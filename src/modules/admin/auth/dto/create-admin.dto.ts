import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'manager@oneclickambulance.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;
}
