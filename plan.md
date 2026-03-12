# One Click Ambulance — Backend Build Plan
## Admin Backend + Auth System (User & Driver)
**Stack:** NestJS 10 · PostgreSQL 15 · Redis 7 · TypeORM · JWT · Swagger · Socket.IO · AWS · Razorpay · Firebase

---

## Table of Contents
1. [Project Initialization](#1-project-initialization)
2. [Folder Structure](#2-folder-structure)
3. [Environment Variables](#3-environment-variables)
4. [Database Entities (Relevant Tables)](#4-database-entities)
5. [Auth Module — OTP + JWT (User & Driver)](#5-auth-module)
6. [JWT Strategy — Scalable RBAC Architecture](#6-jwt-strategy--rbac)
7. [Axios HTTP Client with Interceptors](#7-axios-http-client--interceptors)
8. [Admin Auth Module — Email + Password](#8-admin-auth-module)
9. [Admin Module — Dashboard & Management APIs](#9-admin-module)
10. [Swagger Configuration](#10-swagger-configuration)
11. [Global Pipes, Guards & Interceptors](#11-global-pipes-guards--interceptors)
12. [Phase Build Order](#12-phase-build-order)
13. [Cursor Prompts](#13-cursor-prompts)

---

## 1. Project Initialization

```bash
# 1. Scaffold NestJS project
npx @nestjs/cli new one-click-ambulance-api
cd one-click-ambulance-api

# 2. use npm to install required packages

# 3. Install all required dependencies
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/websockets @nestjs/platform-socket.io socket.io
pnpm add @nestjs/throttler @nestjs/schedule
pnpm add passport passport-jwt passport-local
pnpm add class-validator class-transformer
pnpm add bcrypt ioredis firebase-admin
pnpm add aws-sdk @aws-sdk/client-s3
pnpm add razorpay axios
pnpm add winston nest-winston
pnpm add joi uuid
pnpm add swagger-ui-express

pnpm add -D @types/passport-jwt @types/passport-local
pnpm add -D @types/bcrypt @types/multer
pnpm add -D jest @types/jest ts-jest supertest @types/supertest
```

---

## 2. Folder Structure

```
src/
├── main.ts                          # Bootstrap: Swagger, global pipes, CORS
├── app.module.ts                    # Root module
│
├── config/
│   ├── app.config.ts                # App-level config factory
│   ├── database.config.ts           # TypeORM config factory
│   ├── jwt.config.ts                # JWT secrets & expiry config
│   └── validation.schema.ts         # Joi env validation (fails fast on missing vars)
│
├── database/
│   ├── database.module.ts
│   └── entities/
│       ├── user.entity.ts
│       ├── driver.entity.ts
│       ├── admin-user.entity.ts
│       ├── refresh-token.entity.ts  # Tracks issued refresh tokens in Redis
│       └── audit-log.entity.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # @CurrentUser() → req.user
│   │   ├── roles.decorator.ts           # @Roles(Role.ADMIN, Role.DRIVER)
│   │   └── public.decorator.ts          # @Public() → skips JwtAuthGuard
│   ├── enums/
│   │   └── role.enum.ts                 # Role.USER | Role.DRIVER | Role.ADMIN (extensible)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # Global guard — checks access token
│   │   └── roles.guard.ts               # Checks @Roles() against req.user.role
│   ├── filters/
│   │   └── global-exception.filter.ts   # Catches all unhandled exceptions
│   ├── interceptors/
│   │   ├── response-transform.interceptor.ts  # Wraps all responses: { success, data, timestamp }
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   └── dto/
│       └── pagination.dto.ts
│
├── modules/
│   ├── auth/                        # OTP + JWT for USER & DRIVER
│   ├── admin/                       # Admin login + dashboard + management APIs
│   ├── users/                       # Customer CRUD
│   └── drivers/                     # Driver CRUD (built in Phase 2)
│
├── shared/
│   ├── redis/
│   │   └── redis.service.ts         # ioredis wrapper: get/set/del/ttl
│   ├── sms/
│   │   └── sms.service.ts           # MSG91 OTP dispatch
│   ├── http/
│   │   ├── http.module.ts           # Axios instance module (global)
│   │   └── http.service.ts          # Axios with interceptors (auth, retry, logging)
│   └── firebase/
│       └── firebase.service.ts      # Firebase Admin SDK init
│
└── gateways/
    ├── rides.gateway.ts
    └── tracking.gateway.ts
```

---

## 3. Environment Variables

Create `.env` in project root. Create `validation.schema.ts` to validate all vars on startup.

```env
# ─── Application ─────────────────────────────────────────────
NODE_ENV=development
PORT=3000
API_VERSION=v1
APP_NAME=OneClickAmbulance

# ─── Database (PostgreSQL) ────────────────────────────────────
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ambulance_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_SSL=false
DATABASE_SYNC=true           # Set to false in production, use migrations

# ─── Redis ───────────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ─── JWT ─────────────────────────────────────────────────────
JWT_ACCESS_SECRET=your_jwt_access_secret_minimum_32_chars_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_minimum_32_chars_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# ─── Admin Auth ───────────────────────────────────────────────
ADMIN_JWT_SECRET=your_admin_jwt_secret_minimum_32_chars_long
ADMIN_JWT_EXPIRES_IN=8h
ADMIN_DEFAULT_EMAIL=admin@oneclickambulance.com
ADMIN_DEFAULT_PASSWORD=Admin@123          # Change immediately after first deploy

# ─── OTP (MSG91) ─────────────────────────────────────────────
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_ID=AMBLNC
MSG91_TEMPLATE_ID=your_msg91_otp_template_id
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# ─── Firebase ─────────────────────────────────────────────────
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# ─── AWS ──────────────────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_S3_BUCKET=one-click-ambulance-docs

# ─── Razorpay ─────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

# ─── Google Maps ──────────────────────────────────────────────
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# ─── Platform Config ──────────────────────────────────────────
PLATFORM_COMMISSION_PERCENT=20
DISPATCH_RADIUS_KM=10
DISPATCH_TIMEOUT_SECONDS=15

# ─── Rate Limiting ────────────────────────────────────────────
THROTTLE_TTL=60
THROTTLE_LIMIT=100
AUTH_THROTTLE_LIMIT=5          # Stricter for OTP endpoints

# ─── CORS ─────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:3001,https://admin.oneclickambulance.com
```

### `config/validation.schema.ts`

```typescript
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().required(),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  ADMIN_JWT_SECRET: Joi.string().min(32).required(),
  MSG91_AUTH_KEY: Joi.string().required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
});
```

---

## 4. Database Entities

### `common/enums/role.enum.ts`
```typescript
// SCALABLE: Add new roles here — all guards, strategies & tokens auto-adapt
export enum Role {
  USER = 'user',
  DRIVER = 'driver',
  ADMIN = 'admin',
  // Future roles:
  // SUPER_ADMIN = 'super_admin',
  // FLEET_MANAGER = 'fleet_manager',
  // HOSPITAL = 'hospital',
}
```

### `database/entities/user.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mobile_number: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  profile_photo_url: string;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_blocked: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ nullable: true })
  fcm_token: string;

  @Column({ nullable: true })
  device_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### `database/entities/driver.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

export enum DriverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
}

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  mobile_number: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'enum', enum: DriverStatus, default: DriverStatus.PENDING })
  status: DriverStatus;

  @Column({ type: 'enum', enum: Role, default: Role.DRIVER })
  role: Role;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ default: 0 })
  total_rides: number;

  @Column({ default: false })
  is_verified: boolean;

  @Column({ default: false })
  is_online: boolean;

  @Column({ nullable: true })
  fcm_token: string;

  @Column({ nullable: true })
  device_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### `database/entities/admin-user.entity.ts`
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  SUPPORT = 'support',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: AdminRole, default: AdminRole.SUPPORT })
  admin_role: AdminRole;

  @Column({ type: 'enum', enum: Role, default: Role.ADMIN })
  role: Role;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  last_login: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 5. Auth Module

Handles OTP-based login for **USER** and **DRIVER** roles.

### Files to Create
```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts           # Validates access token for all roles
│   └── jwt-refresh.strategy.ts   # Validates refresh token
├── dto/
│   ├── send-otp.dto.ts
│   └── verify-otp.dto.ts
└── interfaces/
    └── jwt-payload.interface.ts
```

### `auth/interfaces/jwt-payload.interface.ts`
```typescript
import { Role } from '../../common/enums/role.enum';

// SCALABLE: Adding a new role requires zero changes here
export interface JwtPayload {
  sub: string;          // userId or driverId (UUID)
  role: Role;           // Determines access throughout the app
  mobile?: string;      // For user/driver tokens
  email?: string;       // For admin tokens
  iat?: number;
  exp?: number;
}
```

### `auth/dto/send-otp.dto.ts`
```typescript
import { IsString, IsMobilePhone, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  mobile_number: string;

  @ApiProperty({ enum: [Role.USER, Role.DRIVER], example: Role.USER })
  @IsEnum([Role.USER, Role.DRIVER])
  role: Role.USER | Role.DRIVER;
}
```

### `auth/dto/verify-otp.dto.ts`
```typescript
import { IsString, IsMobilePhone, IsEnum, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsMobilePhone('en-IN')
  mobile_number: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ enum: [Role.USER, Role.DRIVER] })
  @IsEnum([Role.USER, Role.DRIVER])
  role: Role.USER | Role.DRIVER;
}
```

### `auth/auth.service.ts`
```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../shared/redis/redis.service';
import { SmsService } from '../../shared/sms/sms.service';
import { User } from '../../database/entities/user.entity';
import { Driver } from '../../database/entities/driver.entity';
import { Role } from '../../common/enums/role.enum';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly smsService: SmsService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const otpKey = `otp:${dto.mobile_number}:${dto.role}`;

    // Rate check — prevent spam (3 OTPs per 5 min)
    const existing = await this.redisService.get(otpKey);
    if (existing) {
      const ttl = await this.redisService.ttl(otpKey);
      if (ttl > (this.configService.get('OTP_EXPIRY_MINUTES') * 60 - 30)) {
        throw new BadRequestException('OTP already sent. Please wait before requesting again.');
      }
    }

    const otp = this.generateOtp();
    const expiry = this.configService.get<number>('OTP_EXPIRY_MINUTES') * 60;
    await this.redisService.set(otpKey, otp, expiry);
    await this.smsService.sendOtp(dto.mobile_number, otp);

    return { message: `OTP sent to ${dto.mobile_number}` };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpKey = `otp:${dto.mobile_number}:${dto.role}`;
    const storedOtp = await this.redisService.get(otpKey);

    if (!storedOtp || storedOtp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Invalidate OTP after use
    await this.redisService.del(otpKey);

    // Upsert user or driver record
    const entity = await this.upsertEntity(dto.mobile_number, dto.role);

    const tokens = await this.generateTokens(entity.id, dto.role, dto.mobile_number);
    return { user: entity, ...tokens };
  }

  async refreshTokens(userId: string, role: Role, refreshToken: string) {
    const redisKey = `refresh:${userId}:${role}`;
    const stored = await this.redisService.get(redisKey);

    if (!stored || stored !== refreshToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const tokens = await this.generateTokens(userId, role);
    return tokens;
  }

  async logout(userId: string, role: Role): Promise<void> {
    await this.redisService.del(`refresh:${userId}:${role}`);
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async upsertEntity(mobile: string, role: Role) {
    if (role === Role.USER) {
      let user = await this.userRepo.findOne({ where: { mobile_number: mobile } });
      if (!user) {
        user = this.userRepo.create({ mobile_number: mobile, is_verified: true });
        await this.userRepo.save(user);
      } else {
        await this.userRepo.update(user.id, { is_verified: true });
      }
      return user;
    } else {
      let driver = await this.driverRepo.findOne({ where: { mobile_number: mobile } });
      if (!driver) {
        driver = this.driverRepo.create({ mobile_number: mobile, is_verified: true });
        await this.driverRepo.save(driver);
      } else {
        await this.driverRepo.update(driver.id, { is_verified: true });
      }
      return driver;
    }
  }

  private async generateTokens(sub: string, role: Role, mobile?: string) {
    const payload: JwtPayload = { sub, role, mobile };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // Store refresh token in Redis for revocation support
    const refreshTtl = 30 * 24 * 60 * 60; // 30 days in seconds
    await this.redisService.set(`refresh:${sub}:${role}`, refreshToken, refreshTtl);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

### `auth/auth.controller.ts`
```typescript
import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@ApiTags('Auth — User & Driver')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to mobile number (User or Driver)' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and receive JWT tokens' })
  @ApiResponse({ status: 201, description: 'Returns access_token + refresh_token + user/driver object' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@Body() body: { user_id: string; role: string; refresh_token: string }) {
    return this.authService.refreshTokens(body.user_id, body.role as any, body.refresh_token);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — invalidates refresh token' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub, user.role);
  }
}
```

---

## 6. JWT Strategy & RBAC

### `common/enums/role.enum.ts`
```typescript
// Add new roles here ONLY — nothing else needs to change
export enum Role {
  USER = 'user',
  DRIVER = 'driver',
  ADMIN = 'admin',
  // SUPER_ADMIN = 'super_admin',
  // HOSPITAL = 'hospital',
  // FLEET_MANAGER = 'fleet_manager',
}
```

### `auth/strategies/jwt.strategy.ts`
```typescript
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
    private readonly configService: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Driver) private readonly driverRepo: Repository<Driver>,
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // SCALABLE: Adding a new role only requires one new case here
    switch (payload.role) {
      case Role.USER: {
        const user = await this.userRepo.findOne({ where: { id: payload.sub } });
        if (!user || user.is_blocked) throw new UnauthorizedException('Account is blocked or not found');
        return { ...payload, entity: user };
      }
      case Role.DRIVER: {
        const driver = await this.driverRepo.findOne({ where: { id: payload.sub } });
        if (!driver || driver.is_blocked) throw new UnauthorizedException('Account is blocked or not found');
        return { ...payload, entity: driver };
      }
      case Role.ADMIN: {
        const admin = await this.adminRepo.findOne({ where: { id: payload.sub } });
        if (!admin || !admin.is_active) throw new UnauthorizedException('Admin account not found or inactive');
        return { ...payload, entity: admin };
      }
      default:
        throw new UnauthorizedException('Unknown role in token');
    }
  }
}
```

### `common/guards/jwt-auth.guard.ts`
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### `common/guards/roles.guard.ts`
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator = any authenticated role allowed
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.some((role) => user?.role === role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
```

### `common/decorators/roles.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
// Usage: @Roles(Role.ADMIN, Role.SUPER_ADMIN) — just add new roles to the enum
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `common/decorators/public.decorator.ts`
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### `common/decorators/current-user.decorator.ts`
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

---

## 7. Axios HTTP Client & Interceptors

The `HttpService` is a shared module wrapping Axios. It handles auth token injection, token refresh on 401, logging, and error normalization. This is used internally for calling external APIs (Google Maps, MSG91, etc.) and can be used by the Flutter/React clients as a reference pattern.

### `shared/http/http.service.ts`
```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

@Injectable()
export class HttpService implements OnModuleInit {
  private readonly logger = new Logger(HttpService.name);
  private axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.addRequestInterceptor();
    this.addResponseInterceptor();
  }

  // ─── Request Interceptor ─────────────────────────────────────
  private addRequestInterceptor() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Log outgoing requests in development
        if (this.configService.get('NODE_ENV') === 'development') {
          this.logger.debug(`[HTTP OUT] ${config.method?.toUpperCase()} ${config.url}`);
        }

        // SCALABLE: Inject API keys or service tokens per domain
        const url = config.url || '';
        if (url.includes('maps.googleapis.com')) {
          config.params = {
            ...config.params,
            key: this.configService.get('GOOGLE_MAPS_API_KEY'),
          };
        }

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      },
    );
  }

  // ─── Response Interceptor ────────────────────────────────────
  private addResponseInterceptor() {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(
          `[HTTP IN] ${response.status} ${response.config.url}`,
        );
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Log errors
        this.logger.error(
          `[HTTP ERR] ${error.response?.status} ${originalRequest?.url}: ${error.message}`,
        );

        // Normalize error shape
        const normalizedError = {
          status: error.response?.status || 500,
          message: error.response?.data?.message || error.message,
          url: originalRequest?.url,
        };

        return Promise.reject(normalizedError);
      },
    );
  }

  // ─── Public Methods ──────────────────────────────────────────
  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }
}
```

### `shared/http/http.module.ts`
```typescript
import { Global, Module } from '@nestjs/common';
import { HttpService } from './http.service';

@Global()  // Available everywhere without re-importing
@Module({
  providers: [HttpService],
  exports: [HttpService],
})
export class HttpModule {}
```

---

## 8. Admin Auth Module

Admin uses **email + password** (bcrypt), not OTP. Admin JWT uses a separate secret.

### Files
```
src/modules/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
├── admin-auth.controller.ts
├── admin-auth.service.ts
├── driver-management.service.ts
└── dto/
    ├── admin-login.dto.ts
    └── create-admin.dto.ts
```

### `admin/dto/admin-login.dto.ts`
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@oneclickambulance.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### `admin/admin-auth.service.ts`
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: AdminLoginDto) {
    const admin = await this.adminRepo.findOne({ where: { email: dto.email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, admin.password_hash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!admin.is_active) throw new UnauthorizedException('Admin account is deactivated');

    await this.adminRepo.update(admin.id, { last_login: new Date() });

    const payload = { sub: admin.id, role: Role.ADMIN, email: admin.email, admin_role: admin.admin_role };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('ADMIN_JWT_SECRET'),
      expiresIn: this.configService.get('ADMIN_JWT_EXPIRES_IN'),
    });

    return {
      access_token,
      admin: { id: admin.id, email: admin.email, name: admin.name, admin_role: admin.admin_role },
    };
  }

  async createAdmin(email: string, password: string, name: string) {
    const exists = await this.adminRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Admin with this email already exists');

    const password_hash = await bcrypt.hash(password, 12);
    const admin = this.adminRepo.create({ email, password_hash, name });
    await this.adminRepo.save(admin);
    return { message: 'Admin created successfully', id: admin.id };
  }
}
```

---

## 9. Admin Module

Admin module provides dashboard metrics, driver/user management, and system control.

### Key Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/login` | Admin email + password login |
| GET | `/admin/dashboard` | Aggregated metrics (rides, revenue, active drivers) |
| GET | `/admin/drivers` | List all drivers (paginated, filterable) |
| GET | `/admin/users` | List all users (paginated) |
| GET | `/admin/bookings` | All bookings with filters |
| POST | `/admin/driver/approve/:id` | Approve driver registration |
| POST | `/admin/driver/reject/:id` | Reject driver application |
| POST | `/admin/driver/suspend/:id` | Suspend driver |
| POST | `/admin/block-driver/:id` | Block driver permanently |
| POST | `/admin/unblock-driver/:id` | Unblock driver |
| POST | `/admin/block-user/:id` | Block user account |
| POST | `/admin/ambulance/approve/:id` | Approve ambulance |
| POST | `/admin/force-cancel-ride/:id` | Force cancel active ride |
| GET | `/admin/payouts` | View payout records |
| POST | `/admin/payout/process` | Trigger manual payout |
| GET | `/admin/audit-logs` | View admin action audit trail |
| GET | `/admin/error-logs` | View backend error logs |
| GET | `/admin/system-health` | System health check |
| PUT | `/system/settings/update` | Update system config key |
| POST | `/admin/maintenance-mode` | Toggle maintenance mode |
| GET | `/admin/pricing` | Get all pricing rules |
| POST | `/admin/pricing/update` | Update pricing rule |
| POST | `/admin/zones/create` | Create service zone |
| GET | `/admin/zones` | List all zones |
| POST | `/admin/notifications/broadcast` | Send broadcast push notification |
| GET | `/analytics/daily-rides` | Daily rides count |
| GET | `/analytics/revenue-summary` | Platform revenue summary |
| GET | `/analytics/top-drivers` | Top performing drivers |
| GET | `/analytics/driver-utilization` | Driver activity metrics |
| GET | `/analytics/ride-cancellations` | Cancellation statistics |
| GET | `/reports/export` | Export report as CSV/Excel |
| GET | `/fraud/gps-mismatch` | Drivers with GPS anomalies |
| POST | `/fraud/flag-driver/:id` | Flag driver as suspicious |

### `admin/admin.service.ts` — Dashboard Query
```typescript
async getDashboardMetrics() {
  const result = await this.bookingRepo.query(`
    SELECT
      COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS rides_today,
      COUNT(*) FILTER (WHERE status = 'trip_started') AS active_rides,
      COUNT(*) FILTER (WHERE status = 'trip_completed' AND DATE(created_at) = CURRENT_DATE) AS completed_today,
      COALESCE(SUM(final_fare) FILTER (WHERE status = 'trip_completed' AND DATE(created_at) = CURRENT_DATE), 0) AS revenue_today
    FROM bookings
  `);

  const activeDrivers = await this.driverStatusRepo.count({ where: { is_online: true } });

  return { ...result[0], active_drivers: activeDrivers };
}
```

---

## 10. Swagger Configuration

API docs will be available at **`http://localhost:3000/docs`**

### `main.ts`
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // ─── Global Prefix ───────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ─── Global Validation Pipe ──────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,                // Strip unknown properties
      forbidNonWhitelisted: true,     // Throw on unknown properties
      transform: true,                // Auto-transform types (string → number, etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── CORS ────────────────────────────────────────────────────
  app.enableCors({
    origin: configService.get<string>('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ─── Swagger ─────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('One Click Ambulance API')
    .setDescription(
      `## One Click Ambulance — Centralized Backend API
      
Serves three clients: **Customer Flutter App**, **Driver Flutter App**, **Admin React Portal**.

### Authentication
- **User / Driver**: OTP-based login → JWT Bearer token
- **Admin**: Email + Password → JWT Bearer token
- Include \`Authorization: Bearer <access_token>\` on all protected routes.

### Roles
- \`user\` — Customer app
- \`driver\` — Driver app  
- \`admin\` — Admin portal (all management endpoints)
      `,
    )
    .setVersion('1.0')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://api.oneclickambulance.com', 'Production')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'access-token',  // <-- Reference name used in @ApiBearerAuth()
    )
    .addTag('Auth — User & Driver', 'OTP-based authentication for customers and drivers')
    .addTag('Auth — Admin', 'Email + password authentication for admin portal')
    .addTag('Users', 'Customer profile management')
    .addTag('Drivers', 'Driver registration and management')
    .addTag('Ambulances', 'Ambulance registration and nearby search')
    .addTag('Bookings', 'Booking creation, fare estimation, history')
    .addTag('Rides', 'Ride lifecycle management')
    .addTag('Tracking', 'Live GPS tracking')
    .addTag('Payments', 'Razorpay payment processing')
    .addTag('Wallet', 'Driver wallet and payouts')
    .addTag('Admin — Dashboard', 'Dashboard metrics and system overview')
    .addTag('Admin — Driver Management', 'Driver approval, suspension, blocking')
    .addTag('Admin — User Management', 'User blocking and management')
    .addTag('Admin — Ride Management', 'Force cancel, reassign rides')
    .addTag('Admin — Pricing & Zones', 'Fare rules and service zones')
    .addTag('Analytics', 'Ride and revenue analytics')
    .addTag('Reports', 'Data export in CSV/Excel')
    .addTag('Notifications', 'Push notifications via FCM')
    .addTag('Chat', 'In-app chat between user and driver')
    .addTag('Support', 'Support tickets and messages')
    .addTag('Fraud Detection', 'GPS anomalies and duplicate account detection')
    .addTag('System', 'Health check, settings, app version')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,          // Remember token between page refreshes
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',                // Collapse all by default (cleaner view)
      filter: true,                        // Enable search/filter
      tryItOutEnabled: true,               // Enable "Try it out" by default
    },
    customSiteTitle: 'One Click Ambulance API Docs',
  });

  // ─── Start Server ────────────────────────────────────────────
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`\n🚑 One Click Ambulance API running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Swagger Docs available at: http://localhost:${port}/docs\n`);
}

bootstrap();
```

### Controller Swagger Decoration Pattern
```typescript
// Apply this pattern to ALL controllers
@ApiTags('Admin — Driver Management')       // Groups in Swagger sidebar
@ApiBearerAuth('access-token')              // Shows lock icon, enables auth
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {

  @Get('drivers')
  @ApiOperation({ summary: 'List all drivers', description: 'Returns paginated list of all drivers with status filter' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: DriverStatus })
  @ApiResponse({ status: 200, description: 'Paginated driver list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin role required' })
  listDrivers(@Query() query: PaginationDto) { ... }
}
```

---

## 11. Global Pipes, Guards & Interceptors

### `common/interceptors/response-transform.interceptor.ts`
```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### `app.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validationSchema } from './config/validation.schema';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { HttpModule } from './shared/http/http.module';
import { RedisModule } from './shared/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    TypeOrmModule.forRootAsync({ useFactory: () => ({ /* database.config */ }) }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HttpModule,
    RedisModule,
    AuthModule,
    AdminModule,
    // Phase 2+: UsersModule, DriversModule, AmbulancesModule, BookingsModule...
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },       // Global JWT check
    { provide: APP_GUARD, useClass: RolesGuard },         // Global RBAC check
    { provide: APP_GUARD, useClass: ThrottlerGuard },     // Global rate limiting
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
```

---

## 12. Phase Build Order

### Phase 1 — Foundation & Auth (Week 1) ← **BUILD THIS FIRST**

| Day | Tasks |
|-----|-------|
| Day 1 | Project init, ESLint/Prettier, Docker Compose (`db + redis`), `.env` |
| Day 2 | All TypeORM entities (`users`, `drivers`, `admin_users`, `audit_logs`). Run migrations. Verify in psql. |
| Day 3 | `RedisService`, `SmsService` (MSG91). Auth module: `send-otp`, `verify-otp`. Test with Postman. |
| Day 4 | `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, `@Public`, `@Roles`, `@CurrentUser`. Refresh + logout endpoints. |
| Day 5 | Admin auth (email+password). `AdminModule` scaffold. Swagger setup at `/docs`. Full auth flow test. |

### Phase 2 — Driver, Ambulance & Booking (Week 2)
Driver registration → S3 document upload → Admin approval → Ambulance CRUD → Fare estimation → Booking creation

### Phase 3 — Dispatch & Ride (Weeks 2–3)
Dispatch algorithm → Socket.IO gateway → Ride state machine → OTP verification → GPS tracking → Firebase sync

### Phase 4 — Payments & Wallet (Week 4)
Razorpay order creation → HMAC verification → Webhook handler → Wallet auto-credit → Weekly payout cron

### Phase 5 — Admin APIs, Analytics & Extras (Week 5)
Full admin dashboard → Analytics queries → FCM notifications → In-app chat → Fraud detection

### Phase 6 — Testing & Deployment (Week 6)
Jest unit tests → Integration tests → Swagger docs finalize → Docker production build → AWS ECS deploy

---

## 13. Cursor Prompts

Use these in Cursor Chat or with Cmd+K for each module:

### Auth Module
```
Create a NestJS Auth module with:
- OTP-based login via MSG91 SMS (6-digit, Redis store with 5min TTL)
- JWT access tokens (15min) + refresh tokens (30 days, stored in Redis for revocation)
- Passport JWT strategy that handles 3 roles: USER, DRIVER, ADMIN
- @Public() decorator to skip JwtAuthGuard on OTP endpoints
- RolesGuard using @Roles() decorator
- Rate limiting: max 3 OTP requests per minute per mobile
- Full Swagger decorators on all endpoints
- Endpoints: POST /auth/send-otp, /auth/verify-otp, /auth/refresh, /auth/logout
```

### Admin Auth
```
Create NestJS AdminAuthService with:
- POST /admin/login using email + bcrypt password comparison
- Separate JWT secret (ADMIN_JWT_SECRET) from user/driver tokens
- Token payload includes: sub (admin id), role: 'admin', email, admin_role enum
- Update admin.last_login on successful login
- Return { access_token, admin: { id, email, name, admin_role } }
- Swagger @ApiTags('Auth — Admin'), @ApiBearerAuth decorators
```

### Scalable RBAC
```
Create a NestJS RolesGuard that:
- Reads @Roles(...roles) decorator using Reflector
- Returns true if no @Roles() decorator is present (open to all authenticated)
- Checks req.user.role against required roles array
- Throws ForbiddenException with descriptive message
- Works for current roles (USER, DRIVER, ADMIN) and future roles without code changes
- Add Role enum to common/enums/role.enum.ts with comments for future roles
```

### Axios HttpService
```
Create a NestJS HttpService wrapping Axios with:
- Request interceptor: logs outgoing requests, injects Google Maps API key for maps.googleapis.com URLs
- Response interceptor: logs response status, normalizes error shape { status, message, url }
- Methods: get<T>, post<T>, put<T>, delete<T> with proper TypeScript generics
- Mark module as @Global() so it's available without re-importing
- Use ConfigService for all secrets, never hardcode
```

### Swagger Setup
```
Configure Swagger in main.ts for NestJS with:
- Available at /docs (not /api or /swagger)
- Title: 'One Click Ambulance API'
- Bearer auth scheme named 'access-token'
- Tags for every module: Auth, Admin, Users, Drivers, Bookings, Rides, Payments, etc.
- persistAuthorization: true so token survives page refresh
- docExpansion: 'none' for clean default view
- Production server URL + local dev URL in servers list
- Console log the docs URL on app start
```

---

*Plan prepared for Cursor IDE · One Click Ambulance · March 2026*
*Next: Begin Phase 1 Day 1 — run `nest new`, install deps, configure Docker Compose*