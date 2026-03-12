# One Click Ambulance — Backend Progress

## Implemented (Phase 1 — Foundation & Auth)

### 1. Project Initialization ✅
- NestJS 11 project scaffolded with npm
- Dependencies installed: `@nestjs/config`, `@nestjs/jwt`, `@nestjs/passport`, `@nestjs/swagger`, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/throttler`, `passport`, `passport-jwt`, `passport-local`, `class-validator`, `class-transformer`, `bcrypt`, `ioredis`, `axios`, `joi`, `uuid`, `swagger-ui-express`
- Dev dependencies: `@types/passport-jwt`, `@types/passport-local`, `@types/bcrypt`, `@types/uuid`

### 2. Folder Structure ✅
```
src/
├── main.ts
├── app.module.ts
├── config/           (app, database, jwt, validation.schema)
├── database/         (entities, database.module)
├── common/           (decorators, guards, filters, interceptors, pipes, dto)
├── modules/         (auth, admin)
└── shared/           (redis, sms, http)
```

### 3. Config ✅
- `config/validation.schema.ts` — Joi env validation
- `config/database.config.ts` — TypeORM PostgreSQL config
- `config/app.config.ts` — App-level config
- `config/jwt.config.ts` — JWT config
- `.env.example` — PostgreSQL-compatible template

### 4. Database Entities ✅
- `user.entity.ts` — Customer (mobile OTP auth)
- `driver.entity.ts` — Driver (status: pending/approved/rejected/suspended/blocked)
- `admin-user.entity.ts` — Admin (email + bcrypt)
- `audit-log.entity.ts` — Admin action audit trail
- `common/enums/role.enum.ts` — Role.USER | Role.DRIVER | Role.ADMIN

### 5. Auth Module — OTP + JWT (User & Driver) ✅
- **POST** `/api/v1/auth/send-otp` — Send OTP via MSG91 (or log OTP when MSG91 not configured)
- **POST** `/api/v1/auth/verify-otp` — Verify OTP, return access + refresh tokens
- **POST** `/api/v1/auth/refresh` — Refresh access token
- **POST** `/api/v1/auth/logout` — Invalidate refresh token
- Redis OTP storage (5 min TTL)
- Redis refresh token storage (30 days)
- Rate limiting: 3 OTP requests per minute per mobile

### 6. JWT Strategy & RBAC ✅
- `JwtStrategy` — Validates user/driver tokens (JWT_ACCESS_SECRET)
- `AdminJwtStrategy` — Validates admin tokens (ADMIN_JWT_SECRET)
- `JwtAuthGuard` — Tries both strategies (admin-jwt, jwt)
- `RolesGuard` — Checks `@Roles()` against `req.user.role`
- `@Public()` — Skips JWT guard
- `@CurrentUser()` — Injects `req.user`
- `@Roles(Role.ADMIN)` — Restricts by role

### 7. Shared Services ✅
- **RedisService** — get/set/del/ttl (ioredis)
- **SmsService** — MSG91 OTP dispatch (graceful when not configured)
- **HttpService** — Axios with request/response interceptors (global)

### 8. Admin Auth Module ✅
- **POST** `/api/v1/admin/login` — Email + password login
- **POST** `/api/v1/admin/create` — Create admin (ADMIN role required)
- Separate JWT secret (ADMIN_JWT_SECRET)
- Default admin seeded on startup (ADMIN_DEFAULT_EMAIL, ADMIN_DEFAULT_PASSWORD)

### 9. Admin Module — Dashboard & Management APIs ✅
- **GET** `/api/v1/admin/dashboard` — Metrics (users, drivers, active_drivers; rides/revenue stubbed for Phase 2)
- **GET** `/api/v1/admin/drivers` — List drivers (paginated, filter by status)
- **GET** `/api/v1/admin/users` — List users (paginated)
- **POST** `/api/v1/admin/driver/approve/:id`
- **POST** `/api/v1/admin/driver/reject/:id`
- **POST** `/api/v1/admin/driver/suspend/:id`
- **POST** `/api/v1/admin/block-driver/:id`
- **POST** `/api/v1/admin/unblock-driver/:id`
- **POST** `/api/v1/admin/block-user/:id`
- **POST** `/api/v1/admin/unblock-user/:id`

### 10. Swagger ✅
- Available at `http://localhost:3000/docs`
- Bearer auth scheme `access-token`
- Tags: Auth, Admin — Dashboard, Admin — Driver Management, Admin — User Management
- `persistAuthorization: true`

### 11. Global Pipes, Guards & Interceptors ✅
- `ValidationPipe` — whitelist, forbidNonWhitelisted, transform
- `JwtAuthGuard` — Global (skips `@Public()` routes)
- `RolesGuard` — Global RBAC
- `ThrottlerGuard` — Rate limiting
- `ResponseTransformInterceptor` — `{ success, data, timestamp }`
- `GlobalExceptionFilter` — Normalized error responses

---

## Notes for Setup

1. **Database**: Supports **MySQL** (default) and **PostgreSQL**.
   - **MySQL**: Set `DATABASE_TYPE=mysql`, port 3306 (default in .env)
   - **PostgreSQL**: Set `DATABASE_TYPE=postgres`, port 5432. Or run `docker-compose up -d postgres`

2. **Redis**: Must be running for OTP & refresh tokens. Options:
   - **Docker**: `docker-compose up -d redis` (from backend folder)
   - **Windows**: [Memurai](https://www.memurai.com/) (Redis-compatible) or WSL2 with Redis

3. **JWT secrets**: Must be ≥ 32 characters. Use strong secrets in production.

4. **MSG91**: Optional for dev — OTP is logged to console when MSG91_AUTH_KEY is not set.

---

## Pending (Phase 2+)
- Bookings, Ambulances, Rides, Payments, Wallet
- Socket.IO gateways
- Firebase, AWS S3, Razorpay integration
- Full admin analytics (daily-rides, revenue, payouts)
- Users/Drivers CRUD modules
