import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../../database/entities/admin-user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Role } from '../../../common/enums/role.enum';
import { AdminRole } from '../../../database/entities/admin-user.entity';

@Injectable()
export class AdminAuthService implements OnModuleInit {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.adminRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, admin.password_hash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!admin.is_active) {
      throw new UnauthorizedException('Admin account is deactivated');
    }

    const payload = {
      sub: admin.id,
      role: Role.ADMIN,
      email: admin.email,
      admin_role: admin.admin_role,
    };

    const tokens = await this.generateTokens(payload);
    await this.adminRepo.update(admin.id, { last_login: new Date() });

    return {
      ...tokens,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        admin_role: admin.admin_role,
      },
    };
  }

  async generateTokens(payload: any) {
    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('ADMIN_JWT_SECRET'),
      expiresIn: this.configService.get('ADMIN_JWT_EXPIRES_IN') ?? '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret:
        this.configService.get('ADMIN_REFRESH_JWT_SECRET') ??
        this.configService.get('ADMIN_JWT_SECRET'),
      expiresIn: this.configService.get('ADMIN_REFRESH_JWT_EXPIRES_IN') ?? '7d',
    });

    return { access_token, refresh_token };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get('ADMIN_REFRESH_JWT_SECRET') ??
          this.configService.get('ADMIN_JWT_SECRET'),
      });

      const admin = await this.adminRepo.findOne({
        where: { id: payload.sub },
      });
      if (!admin || !admin.is_active) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: admin.id,
        role: Role.ADMIN,
        email: admin.email,
        admin_role: admin.admin_role,
      };

      return this.generateTokens(newPayload);
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async onModuleInit() {
    const defaultEmail = this.configService.get('ADMIN_DEFAULT_EMAIL');
    const defaultPassword = this.configService.get('ADMIN_DEFAULT_PASSWORD');
    if (defaultEmail && defaultPassword) {
      const exists = await this.adminRepo.findOne({
        where: { email: defaultEmail.toLowerCase() },
      });
      if (!exists) {
        const password_hash = await bcrypt.hash(defaultPassword, 12);
        const admin = this.adminRepo.create({
          email: defaultEmail.toLowerCase(),
          password_hash,
          name: 'System Administrator',
          admin_role: AdminRole.SUPER_ADMIN,
        });
        await this.adminRepo.save(admin);
      }
    }
  }

  async createAdmin(email: string, password: string, name: string) {
    const exists = await this.adminRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (exists) {
      throw new ConflictException('Admin with this email already exists');
    }

    const password_hash = await bcrypt.hash(password, 12);
    const admin = this.adminRepo.create({
      email: email.toLowerCase(),
      password_hash,
      name,
    });
    await this.adminRepo.save(admin);
    return { message: 'Admin created successfully', id: admin.id };
  }
}
