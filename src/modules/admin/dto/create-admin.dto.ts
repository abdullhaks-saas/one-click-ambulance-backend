import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@oneclickambulance.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'System Admin' })
  @IsString()
  name: string;
}
