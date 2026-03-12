import { Injectable } from '@nestjs/common';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class AdminBookingsService {
  async listBookings(_query: PaginationDto) {
    // Placeholder for Phase 2 - bookings entity not yet created
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 0,
      },
    };
  }
}
