import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Body optional when `user_refresh_token` cookie is set (browser). Mobile/Thunder can send refresh_token only. */
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Deprecated: sub is taken from the refresh JWT. Kept for backward compatibility.',
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Required only if refresh cookie is not sent (e.g. React Native, API clients).',
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
