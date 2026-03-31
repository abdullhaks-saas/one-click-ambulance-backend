import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../../database/entities/booking.entity';
import { TollCharge } from '../../../database/entities/toll-charge.entity';
import { UserInvoiceController } from './user-invoice.controller';
import { UserInvoiceService } from './user-invoice.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, TollCharge])],
  controllers: [UserInvoiceController],
  providers: [UserInvoiceService],
})
export class UserInvoiceModule {}
