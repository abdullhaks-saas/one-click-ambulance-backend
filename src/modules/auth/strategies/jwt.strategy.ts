import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from '../../../database/entities/user.entity';
import { Driver } from '../../../database/entities/driver.entity';
import { AdminUser } from '../../../database/entities/admin-user.entity';
import { Role } from '../../../common/enums/role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload) {
    switch (payload.role) {
      case Role.USER: {
        const user = await this.userRepo.findOne({
          where: { id: payload.sub },
        });
        if (!user || user.is_blocked) {
          throw new UnauthorizedException('Account is blocked or not found');
        }
        return { ...payload, entity: user };
      }
      case Role.DRIVER: {
        const driver = await this.driverRepo.findOne({
          where: { id: payload.sub },
        });
        if (!driver || driver.is_blocked) {
          throw new UnauthorizedException('Account is blocked or not found');
        }
        return { ...payload, entity: driver };
      }
      case Role.ADMIN: {
        const admin = await this.adminRepo.findOne({
          where: { id: payload.sub },
        });
        if (!admin || !admin.is_active) {
          throw new UnauthorizedException(
            'Admin account not found or inactive',
          );
        }
        return { ...payload, entity: admin };
      }
      default:
        throw new UnauthorizedException('Unknown role in token');
    }
  }
}
