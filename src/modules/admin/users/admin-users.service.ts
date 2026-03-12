import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listUsers(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepo.findAndCount({
      skip,
      take: limit,
      order: { created_at: 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async blockUser(id: string) {
    await this.userRepo.update(id, { is_blocked: true });
    return { message: 'User blocked' };
  }

  async unblockUser(id: string) {
    await this.userRepo.update(id, { is_blocked: false });
    return { message: 'User unblocked' };
  }
}
