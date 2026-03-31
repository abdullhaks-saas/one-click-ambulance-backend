import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { UserRegisterDto } from './dto/register.dto';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdateUserDeviceDto } from './dto/update-device.dto';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  mapPublic(user: User) {
    return {
      id: user.id,
      name: user.name,
      mobile_number: user.mobile_number,
      email: user.email,
      profile_photo_url: user.profile_photo_url,
      is_verified: user.is_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.mapPublic(user);
  }

  async register(userId: string, dto: UserRegisterDto) {
    await this.ensureEmailAvailable(userId, dto.email);
    await this.userRepo.update(userId, {
      name: dto.name,
      ...(dto.email !== undefined ? { email: dto.email } : {}),
    });
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return this.mapPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto) {
    if (dto.email !== undefined && dto.email !== null) {
      await this.ensureEmailAvailable(userId, dto.email);
    }
    const patch: Partial<User> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.email !== undefined) patch.email = dto.email ?? undefined;
    if (dto.profile_photo_url !== undefined) {
      patch.profile_photo_url = dto.profile_photo_url ?? undefined;
    }
    if (Object.keys(patch).length) {
      await this.userRepo.update(userId, patch);
    }
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return this.mapPublic(user);
  }

  async updateDevice(userId: string, dto: UpdateUserDeviceDto) {
    const patch: Partial<User> = {};
    if (dto.fcm_token !== undefined) {
      patch.fcm_token = dto.fcm_token ?? undefined;
    }
    if (dto.device_id !== undefined) {
      patch.device_id = dto.device_id ?? undefined;
    }
    if (Object.keys(patch).length) {
      await this.userRepo.update(userId, patch);
    }
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });
    return this.mapPublic(user);
  }

  private async ensureEmailAvailable(userId: string, email?: string | null) {
    if (!email) return;
    const taken = await this.userRepo.findOne({ where: { email } });
    if (taken && taken.id !== userId) {
      throw new ConflictException('Email already in use');
    }
  }
}
