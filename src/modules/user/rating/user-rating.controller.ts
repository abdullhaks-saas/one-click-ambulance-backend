import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRatingService } from './user-rating.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';

@ApiTags('User — Rating')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('rating')
export class UserRatingController {
  constructor(private readonly ratingService: UserRatingService) {}

  @Post('submit')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Rate the driver after trip completed (Phase J)' })
  submit(
    @CurrentUser() auth: JwtPayload,
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratingService.submit(auth.sub, dto);
  }
}
