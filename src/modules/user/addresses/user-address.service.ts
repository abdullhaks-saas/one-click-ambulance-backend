import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from '../../../database/entities/user-address.entity';
import { assertValidCoordinates } from '../../../common/utils/geo';
import { CreateUserAddressDto } from './dto/create-user-address.dto';

@Injectable()
export class UserAddressService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly addressRepo: Repository<UserAddress>,
  ) {}

  async list(userId: string) {
    return this.addressRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async add(userId: string, dto: CreateUserAddressDto) {
    assertValidCoordinates(Number(dto.latitude), Number(dto.longitude));
    const row = this.addressRepo.create({
      user_id: userId,
      address_line: dto.address_line,
      latitude: dto.latitude as unknown as number,
      longitude: dto.longitude as unknown as number,
    });
    return this.addressRepo.save(row);
  }

  async remove(userId: string, addressId: string) {
    const res = await this.addressRepo.delete({
      id: addressId,
      user_id: userId,
    });
    if (!res.affected) {
      throw new NotFoundException('Address not found');
    }
  }
}
