import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common/pipes';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { UserAmbulanceService } from './user-ambulance.service';
import { NearbyAmbulancesQueryDto } from './dto/nearby-ambulances.query.dto';

@ApiTags('User — Ambulance')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('ambulance')
export class UserAmbulanceController {
  constructor(private readonly ambulanceService: UserAmbulanceService) {}

  @Get('types')
  @ApiOperation({ summary: 'List ambulance types (Basic, ICU, …)' })
  types() {
    return this.ambulanceService.listTypes();
  }

  @Get('nearby')
  @ApiOperation({
    summary:
      'Find available approved ambulances near a point (dispatch search radius)',
  })
  nearby(@Query() query: NearbyAmbulancesQueryDto) {
    return this.ambulanceService.findNearby(
      query.latitude,
      query.longitude,
      query.ambulance_type_id,
    );
  }

  @Get('details')
  @ApiOperation({ summary: 'Ambulance detail with equipment and driver summary' })
  details(@Query('ambulance_id', ParseUUIDPipe) ambulanceId: string) {
    return this.ambulanceService.getDetails(ambulanceId);
  }
}
