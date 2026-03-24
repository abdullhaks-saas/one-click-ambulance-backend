import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminPayoutsService } from './admin-payouts.service';
import { ProcessPayoutDto } from './dto/process-payout.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Admin — Payouts')
@Controller('admin/payout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class AdminPayoutProcessController {
  constructor(private readonly adminPayoutsService: AdminPayoutsService) {}

  @Post('process')
  @ApiOperation({
    summary:
      'Process payout: debit driver_wallet, create payout + payout_transactions (ledger)',
  })
  @ApiResponse({ status: 200 })
  process(
    @Body() dto: ProcessPayoutDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as AdminJwtPayload).sub;
    const ipAddress = req.ip ?? req.socket?.remoteAddress;
    return this.adminPayoutsService.processWeeklyPayouts(adminId, dto, ipAddress);
  }
}
