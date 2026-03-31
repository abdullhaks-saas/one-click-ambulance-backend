import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserInvoiceService } from './user-invoice.service';

@ApiTags('User — Invoice')
@ApiBearerAuth('access-token')
@Roles(Role.USER)
@Controller('user/bookings')
export class UserInvoiceController {
  constructor(private readonly invoiceService: UserInvoiceService) {}

  @Get(':bookingId/invoice')
  @ApiOperation({ summary: 'Download PDF invoice for a completed booking (Phase M)' })
  @ApiProduces('application/pdf')
  async download(
    @CurrentUser() auth: JwtPayload,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Res() res: Response,
  ) {
    const buf = await this.invoiceService.buildPdfBuffer(
      bookingId,
      auth.sub,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="invoice-${bookingId}.pdf"`,
    );
    res.send(buf);
  }
}
