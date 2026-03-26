import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { SkipTransform } from '../../../common/decorators/skip-transform.decorator';
import { AdminReportsService } from './admin-reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportExportQueryDto } from './dto/report-export-query.dto';

@ApiTags('Admin — Reports & exports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('rides')
  @ApiOperation({ summary: 'Phase 9: Ride report' })
  rides(@Query() query: ReportQueryDto) {
    return this.reportsService.ridesReport(query);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Phase 9: Revenue by day' })
  revenue(@Query() query: ReportQueryDto) {
    return this.reportsService.revenueReport(query);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Phase 9: Driver performance' })
  drivers(@Query() query: ReportQueryDto) {
    return this.reportsService.driversReport(query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Phase 9: Payment transactions' })
  payments(@Query() query: ReportQueryDto) {
    return this.reportsService.paymentsReport(query);
  }

  @Get('cancellations')
  @ApiOperation({ summary: 'Phase 9: Cancellations' })
  cancellations(@Query() query: ReportQueryDto) {
    return this.reportsService.cancellationsReport(query);
  }

  @Get('export')
  @SkipTransform()
  @ApiOperation({
    summary: 'Phase 9: Export report (csv or xlsx)',
    description: 'Use ?report=&format=csv|xlsx&from=&to=',
  })
  async export(@Query() query: ReportExportQueryDto, @Res() res: Response) {
    await this.reportsService.exportReport(query, res);
  }
}
