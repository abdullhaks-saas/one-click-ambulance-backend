import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminUser } from '../../../database/entities/admin-user.entity';
import { Role } from '../../../common/enums/role.enum';

interface AdminJwtPayload {
  sub: string;
  role: Role;
  email?: string;
  admin_role?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET') ?? '',
    });
  }

  async validate(payload: AdminJwtPayload) {
    const admin = await this.adminRepo.findOne({
      where: { id: payload.sub },
    });
    if (!admin || !admin.is_active) {
      throw new UnauthorizedException('Admin account not found or inactive');
    }
    return {
      ...payload,
      entity: admin,
    };
  }
}
