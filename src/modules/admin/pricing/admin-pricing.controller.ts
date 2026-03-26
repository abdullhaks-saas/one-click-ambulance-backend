import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminPricingService } from './admin-pricing.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

interface AdminRequestUser {
  sub: string;
  role: Role;
}

@ApiTags('Admin — Pricing Configuration')
@Controller('admin/pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminPricingController {
  constructor(private readonly adminPricingService: AdminPricingService) {}

  @Get()
  @ApiOperation({ summary: 'Get all pricing rules per ambulance type' })
  @ApiResponse({
    status: 200,
    description: 'Pricing rules for all ambulance types',
  })
  getAllPricing() {
    return this.adminPricingService.getAllPricingRules();
  }

  @Get(':ambulance_type_id')
  @ApiOperation({ summary: 'Pricing for specific ambulance type' })
  @ApiParam({ name: 'ambulance_type_id', description: 'Ambulance type UUID' })
  @ApiResponse({ status: 200, description: 'Pricing rule for ambulance type' })
  @ApiResponse({ status: 404, description: 'Ambulance type not found' })
  getPricingByAmbulanceType(
    @Param('ambulance_type_id') ambulanceTypeId: string,
  ) {
    return this.adminPricingService.getPricingByAmbulanceType(ambulanceTypeId);
  }

  @Post('update')
  @ApiOperation({ summary: 'Update fare parameters' })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully' })
  @ApiResponse({ status: 404, description: 'Ambulance type not found' })
  updatePricing(
    @Body() dto: UpdatePricingDto,
    @CurrentUser() user: AdminRequestUser,
  ) {
    return this.adminPricingService.updatePricing(
      {
        ambulance_type_id: dto.ambulance_type_id,
        base_fare: dto.base_fare,
        per_km_price: dto.per_km_price,
        emergency_charge: dto.emergency_charge,
        night_charge: dto.night_charge,
        minimum_fare: dto.minimum_fare,
      },
      user.sub,
    );
  }
}
