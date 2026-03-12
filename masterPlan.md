# 🚑 One Click Ambulance — Admin Backend Build Plan

> **Production-Grade NestJS Backend — Centralized for Admin, Driver & User Roles**
> Tech Stack: NestJS · PostgreSQL · Redis · Firebase · AWS · Razorpay · Socket.IO
> Prepared for Cursor IDE development · March 2026

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| REST APIs | 140+ |
| DB Tables | 40 |
| NestJS Modules | 7 |
| Build Phases | 4 |
| Weeks to MVP | 6 |

---

## Table of Contents

1. [Project Overview & Architecture Strategy](#1-project-overview--architecture-strategy)
2. [Technology Stack & Tooling](#2-technology-stack--tooling)
3. [NestJS Project Structure](#3-nestjs-project-structure-modular-monolith)
4. [Database Schema — All 40 Tables](#4-database-schema--all-40-tables)
5. [Module-by-Module Build Plan](#5-module-by-module-build-plan)
   - [5.1 Auth Module](#51-auth-module)
   - [5.2 User Module](#52-user-module)
   - [5.3 Driver Module](#53-driver-module)
   - [5.4 Ambulance Module](#54-ambulance-module)
   - [5.5 Booking & Dispatch Module](#55-booking--dispatch-module)
   - [5.6 Ride & Tracking Module](#56-ride--tracking-module)
   - [5.7 Payment & Wallet Module](#57-payment--wallet-module)
   - [5.8 Admin Module](#58-admin-module)
   - [5.9 Notifications Module](#59-notifications-module)
   - [5.10 Analytics & Reports Module](#510-analytics--reports-module)
   - [5.11 Fraud Detection Module](#511-fraud-detection-module)
   - [5.12 Support & Chat Module](#512-support--chat-module)
6. [Complete API Reference (140+ APIs)](#6-complete-api-reference-140-apis)
7. [Real-time Architecture (Socket.IO + Firebase)](#7-real-time-architecture-socketio--firebase)
8. [Security Implementation](#8-security-implementation)
9. [AWS Infrastructure & Deployment](#9-aws-infrastructure--deployment)
10. [Phased Build Timeline for Cursor](#10-phased-build-timeline-for-cursor)
11. [Cursor-Specific Workflow & Prompting Guide](#11-cursor-specific-workflow--prompting-guide)
12. [Environment Variables & Config](#12-environment-variables--config)
13. [Swagger API Documentation Setup](#13-swagger-api-documentation-setup)

---

## 1. Project Overview & Architecture Strategy

### What We Are Building

One Click Ambulance is a **real-time emergency ambulance dispatch platform** modelled after Uber/Ola. The backend serves three client applications simultaneously: a Flutter customer app, a Flutter driver app, and a React.js admin web portal. All three consume a single, centralized NestJS API — meaning one codebase handles all roles with role-based access control (RBAC) at the route level.

### Architecture Decision: Modular Monolith

For this project we use a **Modular Monolith** pattern inside NestJS — not microservices. This is the right choice because:
- The team is building the MVP
- All modules share the same PostgreSQL database
- It is easy to develop with Cursor
- It can be split into microservices later if needed

Each NestJS module is fully self-contained with its own controllers, services, DTOs, entities and guards.

### System Component Map

| Component | Role in System |
|-----------|---------------|
| Customer Flutter App | Calls REST APIs for booking, tracking, payment. Receives push via FCM. |
| Driver Flutter App | Calls REST APIs for ride management. Receives real-time requests via Socket.IO. |
| Admin React Web Portal | Calls REST APIs for all management functions. Views live map via Socket.IO. |
| NestJS Backend | Single centralized API. Modular architecture. JWT + RBAC. PostgreSQL + Redis. |
| PostgreSQL (AWS RDS) | Primary relational database. 40 tables. TypeORM for ORM layer. |
| Redis (ElastiCache) | Session cache, OTP store, ride request queue, rate limiting. |
| Firebase Realtime DB | Driver location broadcasting. Live ride tracking updates. |
| Socket.IO (NestJS Gateway) | Real-time ride requests to drivers. Admin live map feed. |
| AWS S3 | Document uploads (driving license, photos, etc). |
| Razorpay | Payment processing, webhook handling, payout initiation. |
| FCM (Firebase) | Push notifications to Flutter apps. |
| Twilio / MSG91 | OTP SMS delivery. |

---

## 2. Technology Stack & Tooling

| Technology | Detail |
|------------|--------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10.x |
| Language | TypeScript 5.x (strict mode) |
| ORM | TypeORM 0.3.x |
| Primary DB | PostgreSQL 15 (AWS RDS) |
| Cache / Queue | Redis 7 (AWS ElastiCache) via ioredis |
| Real-time | Socket.IO 4.x (@nestjs/websockets) |
| Auth | JWT (access + refresh tokens), Passport.js |
| OTP SMS | MSG91 or Twilio |
| File Storage | AWS S3 + aws-sdk v3 |
| Push Notifications | Firebase Admin SDK (FCM) |
| Payment | Razorpay Node SDK |
| Maps / Distance | Google Maps Distance Matrix API |
| Email | Nodemailer + AWS SES |
| Validation | class-validator + class-transformer |
| API Docs | Swagger (@nestjs/swagger) — served at `/api/docs` |
| Testing | Jest + Supertest |
| Logging | Winston + nest-winston |
| Config | @nestjs/config + Joi schema validation |
| Task Scheduling | @nestjs/schedule (cron jobs for payouts) |
| Rate Limiting | @nestjs/throttler + Redis store |
| Containerization | Docker + docker-compose (dev) |
| CI/CD | GitHub Actions → AWS ECR → ECS Fargate |
| Code Quality | ESLint + Prettier (enforced in Cursor) |
| Package Manager | pnpm (faster installs) |

---

## 3. NestJS Project Structure (Modular Monolith)

This is the exact folder structure to create in Cursor. Every feature lives in its own module directory. Shared utilities live in `common/`. Database entities live in `database/entities/`.

```
src/
├── main.ts                          # App bootstrap, Swagger, global pipes
├── app.module.ts                    # Root module
│
├── config/
│   ├── app.config.ts                # App-level config factory
│   ├── database.config.ts           # TypeORM config factory
│   ├── jwt.config.ts
│   └── validation.schema.ts         # Joi env validation
│
├── database/
│   ├── database.module.ts
│   └── entities/                    # All 40 TypeORM entities
│       ├── user.entity.ts
│       ├── driver.entity.ts
│       ├── ambulance.entity.ts
│       └── ... (all 40 entities)
│
├── common/
│   ├── decorators/                  # @CurrentUser, @Roles, @Public
│   ├── guards/                      # JwtAuthGuard, RolesGuard
│   ├── filters/                     # GlobalExceptionFilter
│   ├── interceptors/                # ResponseTransformInterceptor, LoggingInterceptor
│   ├── pipes/                       # ValidationPipe config
│   ├── dto/                         # Shared DTOs (pagination, etc.)
│   └── enums/                       # Role, BookingStatus, RideStatus, etc.
│
├── modules/
│   ├── auth/                        # OTP login, JWT, refresh tokens
│   ├── users/                       # Customer CRUD
│   ├── drivers/                     # Driver CRUD, docs, status
│   ├── ambulances/                  # Ambulance CRUD, types, equipment
│   ├── bookings/                    # Booking creation, fare calc
│   ├── dispatch/                    # Nearest driver algorithm
│   ├── rides/                       # Ride lifecycle, OTP
│   ├── tracking/                    # Location updates, Firebase sync
│   ├── payments/                    # Razorpay integration
│   ├── wallet/                      # Driver wallet, payouts
│   ├── notifications/               # FCM push, in-app notifications
│   ├── chat/                        # In-app messaging
│   ├── ratings/                     # Rating & review system
│   ├── pricing/                     # Fare rules, surge pricing
│   ├── zones/                       # Service zone management
│   ├── admin/                       # Admin-only APIs, dashboard
│   ├── analytics/                   # Reports, metrics
│   ├── fraud/                       # Anomaly detection
│   ├── support/                     # Tickets & messages
│   └── system/                      # Settings, health, versioning
│
├── gateways/
│   ├── rides.gateway.ts             # Socket.IO: ride requests to drivers
│   └── tracking.gateway.ts          # Socket.IO: live location to admin/user
│
└── shared/
    ├── aws/                         # S3 service
    ├── firebase/                    # FCM + Realtime DB service
    ├── redis/                       # Redis service
    ├── sms/                         # OTP SMS service
    ├── maps/                        # Google Maps distance service
    └── razorpay/                    # Payment gateway service
```

---

## 4. Database Schema — All 40 Tables

### Core User & Auth Tables (1–5)

| Table | Key Fields & Notes |
|-------|-------------------|
| `users` | Customer accounts. UUID PK, mobile_number (UNIQUE), OTP fields, is_verified, profile data. |
| `user_addresses` | Saved addresses per user. FK → users. Lat/lng for map display. |
| `drivers` | Driver accounts. UUID PK, status ENUM(pending/approved/suspended/rejected), rating DECIMAL, total_rides. |
| `driver_documents` | Uploaded docs per driver. document_type ENUM, S3 URL, verification_status ENUM. |
| `driver_bank_accounts` | Bank details for payout. FK → drivers. IFSC, account number (encrypted at rest). |

### Ambulance Tables (6–8)

| Table | Key Fields & Notes |
|-------|-------------------|
| `ambulances` | Vehicle info. FK → drivers, ambulance_type_id. Insurance expiry, S3 photo URL. Status ENUM. |
| `ambulance_types` | Lookup: Basic, ICU, Ventilator, Dead Body Transport. |
| `ambulance_equipment` | Equipment list per ambulance. FK → ambulances. Simple name field. |

### Location & Status Tables (9–10)

| Table | Key Fields & Notes |
|-------|-------------------|
| `driver_locations` | Latest GPS coords per driver. Updated every 5s during active ride. Indexed on driver_id. PostGIS point optional. |
| `driver_status` | Online/offline toggle. last_seen timestamp. Used by dispatch algorithm. |

### Booking & Ride Tables (11–17)

| Table | Key Fields & Notes |
|-------|-------------------|
| `bookings` | Core booking record. pickup/drop coords, ambulance_type_id, status ENUM(15 stages), estimated_fare, final_fare. |
| `booking_status_history` | Audit trail of every status change with timestamp. |
| `booking_driver_assignments` | Many assignment attempts per booking (dispatch retries). assigned_at, accepted_at, rejected_at. |
| `ride_details` | Computed after completion. total_distance (km), total_duration (min), start/end timestamps. |
| `ride_status` | Current ride status. Enum: accepted/arrived/patient_onboard/trip_started/trip_completed. |
| `ride_otp` | One OTP per booking. 4-digit code, verified boolean, expiry time. |
| `ride_tracking` | GPS trail during active ride. Timestamped lat/lng points. Used for route replay. |

### Payment & Finance Tables (18–24)

| Table | Key Fields & Notes |
|-------|-------------------|
| `ride_ratings` | Post-ride rating. 1–5 star, optional text review. FK → booking, user, driver. |
| `payments` | Payment record. razorpay_payment_id, amount, payment_method ENUM, status ENUM. |
| `payment_transactions` | Raw gateway response storage. For reconciliation. |
| `driver_wallet` | Current balance per driver. Auto-updated on ride completion. |
| `wallet_transactions` | Credit/debit ledger. FK → driver, booking. transaction_type ENUM. |
| `payouts` | Weekly payout records. amount, payout_status ENUM(pending/processing/completed/failed), payout_date. |
| `payout_transactions` | Bank transfer reference and status per payout. |

### Pricing, Zones & Operations Tables (25–40)

| Table | Key Fields & Notes |
|-------|-------------------|
| `pricing_rules` | Per ambulance type: base_fare, per_km_price, emergency_charge, night_charge, minimum_fare. |
| `toll_charges` | Toll amount added to a booking. FK → bookings. |
| `zones` | Service coverage zones. zone_name, city, GeoJSON polygon (optional). |
| `zone_coordinates` | Polygon vertices per zone. FK → zones. lat/lng points. |
| `driver_zones` | Zone assignment per driver. Many-to-many. FK → drivers, zones. |
| `notifications` | In-app notification record. FK → user or driver. type ENUM, read boolean. |
| `notification_logs` | FCM delivery status per notification. |
| `chats` | In-app chat messages per booking. sender_type ENUM(user/driver). message TEXT. |
| `call_logs` | Phone call records per ride. caller, receiver, duration. |
| `system_settings` | Key-value config store. E.g. dispatch_radius_km, platform_commission_pct. |
| `admin_users` | Admin portal accounts. email, password_hash (bcrypt), role ENUM(super_admin/manager/support). |
| `audit_logs` | Every admin action logged. admin_id, action, entity, entity_id, before/after JSON. |
| `app_versions` | Minimum required app version per platform. is_mandatory boolean. |
| `support_tickets` | Customer/driver support requests. status ENUM(open/in_progress/resolved/closed). |
| `ticket_messages` | Threaded messages per ticket. sender_id polymorphic. |
| `error_logs` | Backend error capture. module, error_message, stack_trace. For admin monitoring. |

---

## 5. Module-by-Module Build Plan

> **Build modules in this exact order.** Each module depends on the previous ones.

---

### 5.1 Auth Module

The Auth module is the **first module to build**. It handles OTP-based login for all three roles (user, driver, admin), issues JWT access + refresh tokens, and attaches the authenticated identity to every request via a Passport strategy.

#### Files to Create in Cursor

```
src/modules/auth/
├── auth.module.ts
├── auth.controller.ts          # POST /auth/send-otp, /auth/verify-otp, /auth/logout, /auth/refresh
├── auth.service.ts             # OTP generation, SMS dispatch, JWT signing
├── strategies/
│   ├── jwt.strategy.ts         # Validates access token, attaches user to request
│   └── jwt-refresh.strategy.ts # Validates refresh token for token rotation
├── dto/
│   ├── send-otp.dto.ts         # { mobile_number: string, role: Role }
│   └── verify-otp.dto.ts       # { mobile_number: string, otp: string, role: Role }
└── interfaces/
    └── jwt-payload.interface.ts # { sub: UUID, role: Role, iat, exp }
```

#### Key Implementation Notes

- OTP is a 6-digit number. Store in Redis with 5-minute TTL: key = `otp:{mobile}:{role}`
- On verify: check Redis, mark user/driver as `is_verified=true`, return `{ access_token, refresh_token }`
- Access token TTL = 15 minutes. Refresh token TTL = 30 days. Refresh token stored in Redis for revocation.
- Admin login uses email + password (bcrypt) — not OTP. Separate `POST /admin/login` endpoint.
- Add `@Public()` decorator for OTP routes to bypass global `JwtAuthGuard`.
- `RolesGuard` reads `@Roles(Role.ADMIN)` decorator and checks `req.user.role`.

---

### 5.2 User Module

Handles customer profile management and saved addresses. Most endpoints require `Role.USER`.

#### Files to Create

```
src/modules/users/
├── users.module.ts
├── users.controller.ts       # GET/PUT /user/profile, address CRUD
├── users.service.ts
├── dto/
│   ├── update-profile.dto.ts
│   └── add-address.dto.ts
└── entities/                 # (import from database/entities)
```

---

### 5.3 Driver Module

One of the most complex modules. Handles registration, document upload to S3, admin approval workflow, online/offline toggle, and profile management.

#### Files to Create

```
src/modules/drivers/
├── drivers.module.ts
├── drivers.controller.ts     # Registration, profile, docs, status
├── drivers.service.ts        # Business logic + S3 upload orchestration
├── dto/
│   ├── register-driver.dto.ts
│   ├── update-driver.dto.ts
│   └── upload-document.dto.ts
└── driver-status.service.ts  # go-online/go-offline, last_seen updates
```

#### Key Implementation Notes

- Document upload: use Multer + S3 multipart. File size limit: 5MB. Accept: `image/jpeg`, `image/png`, `application/pdf`
- Driver status ENUM: `pending` → admin approves → `approved`. Suspension sets `status = suspended`.
- `go-online`: validates driver has approved ambulance, sets `is_online=true`, broadcasts to tracking gateway.
- Store driver location update in both PostgreSQL (`driver_locations`) AND Firebase (for real-time map).

---

### 5.4 Ambulance Module

Manages ambulance registration (tied to driver), type lookup, equipment, and admin approval.

#### Files to Create

```
src/modules/ambulances/
├── ambulances.module.ts
├── ambulances.controller.ts  # CRUD, GET /ambulance/nearby, /ambulance/types
├── ambulances.service.ts     # Geospatial nearby query using Haversine SQL
└── dto/
    └── register-ambulance.dto.ts
```

Nearby ambulances query uses the **Haversine formula** in a raw TypeORM query filtering by ambulance_type, `driver is_online=true`, and radius ≤ 10km. Returns list sorted by distance.

---

### 5.5 Booking & Dispatch Module

This is the **core business logic module**. It handles fare estimation, booking creation, and the automated dispatch algorithm that finds and assigns the nearest available driver.

#### Files to Create

```
src/modules/bookings/
├── bookings.module.ts
├── bookings.controller.ts    # POST /booking/create, GET /booking/estimate-fare, history, cancel
├── bookings.service.ts       # Fare calculation, booking creation, cancellation logic
└── dto/
    ├── create-booking.dto.ts
    └── estimate-fare.dto.ts

src/modules/dispatch/
├── dispatch.module.ts
├── dispatch.controller.ts    # Admin manual assign, retry endpoints
├── dispatch.service.ts       # THE DISPATCH ALGORITHM
└── dispatch.gateway.ts       # Socket.IO: push ride request to driver's socket room
```

#### Dispatch Algorithm (Step-by-Step)

| Step | Action |
|------|--------|
| **Step 1 — Booking Created** | `POST /booking/create` validates payload, calls `FareService.calculate()`, saves booking with `status=searching`. |
| **Step 2 — Find Nearest Driver** | `DispatchService.findNearest()`: queries `driver_locations JOIN driver_status WHERE is_online=true AND ambulance_type matches`. Orders by Haversine distance ASC. Filters within 10km radius. |
| **Step 3 — Send Request** | `DispatchService.sendRequest()`: creates `booking_driver_assignments` record. Emits Socket.IO event `ride:request` to driver's socket room. Starts 15-second Redis timeout. |
| **Step 4 — Driver Accepts** | `POST /driver/ride-accept`: updates assignment `accepted_at`, changes booking `status=driver_accepted`. Notifies user via FCM. |
| **Step 5 — Driver Rejects / Timeout** | `POST /driver/ride-reject` or Redis TTL expires: marks assignment `rejected_at`. DispatchService retries with next nearest driver. Max 5 retries then `booking=no_driver_found`. |

#### Fare Calculation Formula

```typescript
FareService.calculate(pickup_coords, drop_coords, ambulance_type_id):
  distance_km  = GoogleMaps.distanceMatrix(pickup, drop)
  rule         = PricingRules.findByAmbulanceType(ambulance_type_id)
  base         = rule.base_fare
  distance_fee = distance_km * rule.per_km_price
  night_fee    = isNightTime() ? rule.night_charge : 0
  emergency    = isEmergency ? rule.emergency_charge : 0
  estimated    = MAX(base + distance_fee + night_fee + emergency, rule.minimum_fare)
  return { estimated_fare: estimated, distance_km, duration_min }
```

---

### 5.6 Ride & Tracking Module

Manages the ride lifecycle after driver acceptance: OTP verification, status progression, GPS tracking, and ride completion.

#### Files to Create

```
src/modules/rides/
├── rides.module.ts
├── rides.controller.ts       # start, end, arrived, onboard, status, OTP verify
├── rides.service.ts          # Status machine: validates allowed transitions
└── dto/
    └── update-ride-status.dto.ts

src/modules/tracking/
├── tracking.module.ts
├── tracking.controller.ts    # POST /driver/location/update
├── tracking.service.ts       # Save to PostgreSQL + push to Firebase RTDB
└── tracking.gateway.ts       # Socket.IO: broadcast location to user/admin
```

#### Ride Status State Machine

Implement a strict state machine. Each status transition is validated:

```
driver_accepted → driver_on_way → driver_arrived → patient_onboard → trip_started → trip_completed
```

Any out-of-order call returns `400 Bad Request`.

#### Location Tracking Architecture

Driver app POSTs GPS every 5 seconds to `POST /driver/location/update`. `TrackingService` saves to `driver_locations` table AND pushes to Firebase path `/rides/{booking_id}/driver_location`. Flutter user app listens to Firebase path directly for low-latency map updates. Admin portal receives via Socket.IO `tracking:location` event.

---

### 5.7 Payment & Wallet Module

Integrates Razorpay for customer payments, manages driver wallet auto-crediting, and processes weekly payouts.

#### Files to Create

```
src/modules/payments/
├── payments.module.ts
├── payments.controller.ts    # POST /payment/initiate, /payment/verify, webhook
├── payments.service.ts       # Razorpay order creation, signature verification
└── dto/
    └── initiate-payment.dto.ts

src/modules/wallet/
├── wallet.module.ts
├── wallet.controller.ts      # GET /driver/wallet, /wallet/transactions
├── wallet.service.ts         # Credit wallet on payment success, deduct commission
└── payout.service.ts         # Weekly cron: process pending payouts via Razorpay Payouts API
```

#### Payment Flow

1. `POST /payment/initiate`: Creates Razorpay order, returns `{ order_id, amount, currency }` to Flutter app.
2. Flutter app opens Razorpay checkout, user pays, app receives `payment_id + signature`.
3. `POST /payment/verify`: Backend verifies HMAC signature. On success: creates payment record, credits driver wallet.
4. **Razorpay webhook** (`POST /payment/webhook`): backup verification. Handles `payment.captured` event.
5. **Commission deduction**: `wallet_credit = final_fare * (1 - commission_rate)`. Creates `wallet_transaction` record.
6. **Weekly payout cron** (`@Cron('0 10 * * MON')`): queries unpaid wallet balance, calls Razorpay Payout API, creates payout record.

---

### 5.8 Admin Module

Admin-only endpoints protected by `@Roles(Role.ADMIN)`. Provides dashboard metrics, driver/ambulance approval, ride management, and system configuration.

#### Files to Create

```
src/modules/admin/
├── admin.module.ts
├── admin.controller.ts           # All /admin/* endpoints
├── admin.service.ts              # Dashboard aggregation queries
├── driver-management.service.ts  # approve, reject, suspend, block
├── ambulance-management.service.ts
├── ride-management.service.ts    # force-cancel, reassign
└── system.service.ts             # settings CRUD, maintenance mode, health check
```

#### Dashboard Aggregation Query

```sql
SELECT
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS rides_today,
  COUNT(*) FILTER (WHERE status = 'trip_started')          AS active_rides,
  COUNT(*) FILTER (WHERE status = 'trip_completed' AND DATE(created_at) = CURRENT_DATE) AS completed_today,
  SUM(final_fare) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'trip_completed') AS revenue_today
FROM bookings;
-- Plus: active drivers count from driver_status WHERE is_online = true
```

---

### 5.9 Notifications Module

Handles FCM push notifications to Flutter apps and in-app notification storage.

#### Files to Create

```
src/modules/notifications/
├── notifications.module.ts
├── notifications.controller.ts  # GET /notifications, POST /notifications/read, broadcast
├── notifications.service.ts     # Save to DB + dispatch FCM
└── fcm.service.ts               # Firebase Admin SDK wrapper for FCM
```

#### Key Notes

- Each user/driver stores their FCM token on login. Store in `users.fcm_token` / `drivers.fcm_token`.
- `NotificationsService.send(userId, title, body, data)`: saves to `notifications` table + calls `FcmService.send()`.
- `FcmService` uses `firebase-admin` SDK: `admin.messaging().send({ token, notification, data })`.
- For broadcast: query all tokens and use `admin.messaging().sendEachForMulticast({ tokens, notification })`.

---

### 5.10 Analytics & Reports Module

Provides all analytics endpoints for the admin portal dashboard and reports section. Uses optimized PostgreSQL queries with date range filtering.

#### Files to Create

```
src/modules/analytics/
├── analytics.module.ts
├── analytics.controller.ts   # 15+ analytics endpoints
└── analytics.service.ts      # Raw SQL aggregation queries

src/modules/reports/
├── reports.module.ts
├── reports.controller.ts     # GET /reports/*, GET /reports/export
└── reports.service.ts        # Build JSON data + CSV/Excel export via ExcelJS
```

---

### 5.11 Fraud Detection Module

Automated anomaly detection for GPS fraud, duplicate accounts, and unusual ride patterns.

- **GPS mismatch**: compare driver's reported location with last known location. Flag if jump > 5km in < 30 seconds.
- **Fake GPS**: compare device GPS with IP geolocation. Flag high mismatch rate drivers.
- **Duplicate accounts**: check `mobile_number` uniqueness + device fingerprint.
- **Ride anomalies**: flag rides where `distance >> estimated_distance` or duration far exceeds ETA.
- Flagged records appear in Admin → Fraud Management screen for manual review.

---

### 5.12 Support & Chat Module

Ticket-based support system and in-app chat between users and drivers during active rides.

#### Files to Create

```
src/modules/support/
├── support.module.ts
├── support.controller.ts     # Ticket CRUD, messages
└── support.service.ts

src/modules/chat/
├── chat.module.ts
├── chat.controller.ts        # POST /chat/send, GET /chat/messages (per booking_id)
├── chat.service.ts           # Save to chats table
└── chat.gateway.ts           # Socket.IO: real-time message delivery
```

---

## 6. Complete API Reference (140+ APIs)

> All APIs use Bearer JWT authentication unless marked as **Public**.
> **Role**: U=User · D=Driver · A=Admin · P=Public

### Authentication APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/send-otp` | Send OTP to mobile number | Public |
| POST | `/auth/verify-otp` | Verify OTP, get JWT tokens | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Revoke refresh token | U/D |
| POST | `/admin/login` | Admin email+password login | Public |

### Customer APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/user/profile` | Get authenticated user profile | U |
| PUT | `/user/profile/update` | Update name, email | U |
| GET | `/user/addresses` | Get saved addresses | U |
| POST | `/user/add-address` | Add a new saved address | U |
| DELETE | `/user/address/:id` | Remove saved address | U |

### Ambulance APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/ambulance/types` | Get all ambulance type options | U |
| GET | `/ambulance/nearby` | Get nearby ambulances by type+coords | U |
| GET | `/ambulance/details/:id` | Get ambulance details by ID | U |

### Booking APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/booking/create` | Create new booking, triggers dispatch | U |
| GET | `/booking/estimate-fare` | Get fare estimate before booking | U |
| GET | `/booking/status/:id` | Get current booking status | U/D |
| GET | `/booking/details/:id` | Full booking details | U/D/A |
| POST | `/booking/cancel/:id` | Cancel a booking | U/A |
| GET | `/booking/history` | User's past bookings | U |

### Ride Lifecycle APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ride/arrived/:id` | Driver marks arrived at pickup | D |
| POST | `/ride/onboard/:id` | Driver marks patient on board | D |
| POST | `/ride/start/:id` | Driver starts trip (after OTP verify) | D |
| POST | `/ride/end/:id` | Driver ends trip | D |
| GET | `/ride/details/:id` | Get ride details | U/D/A |
| GET | `/ride/status/:id` | Get current ride status | U/D |
| GET | `/ride/generate-otp/:id` | Generate ride start OTP for user | U |
| POST | `/ride/verify-otp/:id` | Driver verifies OTP before trip start | D |

### Tracking APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/driver/location/update` | Update driver GPS location (every 5s) | D |
| GET | `/driver/location/:id` | Get current driver location | U/A |
| GET | `/ride/live-location/:id` | Get live location stream URL | U |

### Driver APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/driver/register` | Register new driver account | Public |
| GET | `/driver/profile` | Get driver profile | D |
| PUT | `/driver/profile/update` | Update driver profile | D |
| POST | `/driver/upload-document` | Upload document to S3 | D |
| GET | `/driver/documents` | Get uploaded documents | D |
| POST | `/driver/go-online` | Set driver online status | D |
| POST | `/driver/go-offline` | Set driver offline status | D |
| GET | `/driver/status` | Get current online status | D |
| GET | `/driver/ride-requests` | Get pending ride requests | D |
| POST | `/driver/ride-accept/:id` | Accept a ride request | D |
| POST | `/driver/ride-reject/:id` | Reject a ride request | D |
| GET | `/driver/earnings/daily` | Get today's earnings | D |
| GET | `/driver/earnings/weekly` | Get weekly earnings summary | D |
| GET | `/driver/ride-history` | Get driver past rides | D |

### Wallet & Payment APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/driver/wallet` | Get wallet balance | D |
| GET | `/driver/wallet/transactions` | Get wallet transaction history | D |
| POST | `/payment/initiate` | Create Razorpay order | U |
| POST | `/payment/verify` | Verify payment signature | U |
| POST | `/payment/webhook` | Razorpay webhook (internal) | Public |
| GET | `/payment/history` | User payment history | U |

### Rating, Notifications & Chat APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/rating/submit` | Submit ride rating | U |
| GET | `/driver/ratings` | Get driver rating history | D/A |
| GET | `/notifications` | Get user/driver notifications | U/D |
| POST | `/notifications/read/:id` | Mark notification as read | U/D |
| POST | `/chat/send` | Send chat message | U/D |
| GET | `/chat/messages/:bookingId` | Get chat messages for booking | U/D |

### Admin Management APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/dashboard` | Get dashboard metrics | A |
| GET | `/admin/drivers` | List all drivers (paginated) | A |
| GET | `/admin/users` | List all users (paginated) | A |
| GET | `/admin/bookings` | List all bookings with filters | A |
| POST | `/admin/driver/approve/:id` | Approve driver registration | A |
| POST | `/admin/driver/reject/:id` | Reject driver application | A |
| POST | `/admin/driver/suspend/:id` | Suspend driver account | A |
| POST | `/admin/block-driver/:id` | Block driver account | A |
| POST | `/admin/unblock-driver/:id` | Unblock driver account | A |
| POST | `/admin/block-user/:id` | Block user account | A |
| POST | `/admin/ambulance/approve/:id` | Approve ambulance registration | A |
| POST | `/admin/ambulance/suspend/:id` | Suspend ambulance | A |
| POST | `/admin/force-cancel-ride/:id` | Force cancel active ride | A |
| POST | `/dispatch/manual-assign` | Manually assign driver to ride | A |

### Pricing & Zone APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/pricing` | Get all pricing rules | A |
| POST | `/admin/pricing/update` | Update pricing rule | A |
| POST | `/admin/zones/create` | Create service zone | A |
| GET | `/admin/zones` | List all zones | A |
| PUT | `/admin/zones/:id` | Update zone | A |
| DELETE | `/admin/zones/:id` | Delete zone | A |

### Analytics, Reports & Dispatch APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/analytics/daily-rides` | Rides count for a day | A |
| GET | `/analytics/revenue-summary` | Platform revenue summary | A |
| GET | `/analytics/driver-utilization` | Driver activity metrics | A |
| GET | `/analytics/top-drivers` | Top performing drivers | A |
| GET | `/analytics/ride-cancellations` | Cancellation stats | A |
| GET | `/analytics/zone-demand` | Demand per zone | A |
| GET | `/reports/export` | Export any report as CSV/Excel | A |
| GET | `/dispatch/available-drivers` | Available drivers in radius | A |
| POST | `/dispatch/retry-assignment` | Retry failed dispatch | A |

### Fraud, Support & System APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/fraud/gps-mismatch` | Drivers with GPS anomalies | A |
| GET | `/fraud/duplicate-accounts` | Duplicate account detection | A |
| POST | `/fraud/flag-driver/:id` | Flag driver as suspicious | A |
| POST | `/support/ticket/create` | Create support ticket | U/D |
| GET | `/support/tickets` | List tickets | U/D/A |
| POST | `/support/message` | Reply to ticket | U/D/A |
| GET | `/admin/payouts` | View payout records | A |
| POST | `/admin/payout/process` | Trigger manual payout | A |
| GET | `/admin/error-logs` | View backend error logs | A |
| GET | `/admin/audit-logs` | View admin audit trail | A |
| GET | `/admin/system-health` | Check system health | A |
| PUT | `/system/settings/update` | Update system config key | A |
| POST | `/admin/maintenance-mode` | Toggle maintenance mode | A |
| GET | `/app/version` | Get minimum required app version | Public |

---

## 7. Real-time Architecture (Socket.IO + Firebase)

### Socket.IO Events

| Event Name | Direction | Description |
|------------|-----------|-------------|
| `ride:request` | Server → Driver | Dispatch sends new ride request to specific driver socket room |
| `ride:accepted` | Server → User | Notifies user that driver accepted |
| `ride:rejected` | Server → User | Notifies user driver rejected, retrying |
| `ride:status_update` | Server → User/Admin | Every ride status change (arrived, onboard, etc.) |
| `tracking:location` | Server → User/Admin | Driver GPS update broadcast (every 5s during ride) |
| `chat:message` | Server ↔ User/Driver | Real-time chat message delivery |
| `admin:driver_offline` | Server → Admin | Alert when a driver goes offline unexpectedly |
| `admin:new_booking` | Server → Admin | Live feed of new booking requests |

### Firebase Realtime DB Structure

```json
{
  "rides": {
    "{booking_id}": {
      "driver_location": {
        "lat": 12.9716,
        "lng": 77.5946,
        "heading": 180,
        "updated_at": 1709123456789
      }
    }
  },
  "drivers": {
    "{driver_id}": {
      "is_online": true,
      "lat": 12.9716,
      "lng": 77.5946,
      "ambulance_type": "ICU",
      "updated_at": 1709123456789
    }
  }
}
```

Flutter user app and admin React portal read driver location directly from Firebase RTDB for ultra-low latency (< 200ms). NestJS backend writes to Firebase on every `POST /driver/location/update` call.

---

## 8. Security Implementation

| Security Layer | Implementation Detail |
|---------------|----------------------|
| JWT Auth | Short-lived access tokens (15 min) + refresh tokens (30 days). Refresh tokens stored in Redis for revocation. Implement token rotation on each refresh. |
| RBAC | `RolesGuard` checks `req.user.role` against `@Roles()` decorator. Three roles: ADMIN, DRIVER, USER. |
| OTP Security | Rate limit `/auth/send-otp` to 3 requests/minute per mobile number. OTP expires in 5 minutes. Invalidate after first successful use. |
| Input Validation | All DTOs use `class-validator` decorators. Global `ValidationPipe` with `whitelist:true`, `forbidNonWhitelisted:true`. |
| SQL Injection | TypeORM parameterized queries. No raw string concatenation. Raw queries use TypeORM query builder with parameters. |
| File Upload Security | Multer validates MIME type + file size. S3 bucket is private. Files served via pre-signed URLs (15 min expiry). |
| Payment Security | Razorpay HMAC-SHA256 signature verification on every payment. Webhook endpoint validates Razorpay signature header. |
| GPS Validation | Server-side validation: flag location updates that are physically impossible (> 200 km/h movement). |
| Rate Limiting | `@nestjs/throttler` with Redis store. Global limit: 100 req/min. Auth endpoints: 5 req/min. |
| CORS | Strict CORS: allow only known origins (admin React domain, mobile app bundle IDs). |
| Audit Logging | All admin actions saved to `audit_logs` with before/after state. Immutable records. |
| Secrets Management | All secrets in environment variables. In production: AWS Secrets Manager. Never commit `.env` files. |

---

## 9. AWS Infrastructure & Deployment

| AWS Service | Usage & Config |
|-------------|---------------|
| ECS Fargate | Containerized NestJS app. Auto-scales based on CPU/memory. No server management. |
| RDS PostgreSQL | PostgreSQL 15. Multi-AZ in production. Automated backups. db.t3.medium for MVP. |
| ElastiCache Redis | Redis 7. Single node for MVP, cluster mode for production. cache.t3.micro. |
| S3 | Private bucket for documents. Separate bucket for public assets. Versioning enabled. |
| CloudFront | CDN for S3 public assets. SSL termination for API domain. |
| ECR | Docker image registry. GitHub Actions pushes images on main branch merge. |
| ALB | Application Load Balancer. Routes to ECS tasks. SSL certificate via ACM. |
| Secrets Manager | Stores DB password, JWT secret, Razorpay keys, Firebase credentials. |
| CloudWatch | Logs, metrics, alarms. Alert on error rate > 1%, CPU > 70%. |
| Route 53 | DNS management. `api.oneclickambulance.com` → ALB. |

### Docker Setup for Cursor Development

```yaml
# docker-compose.yml (development)
version: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/ambulance_db
      - REDIS_URL=redis://redis:6379
    volumes: ["./src:/app/src"]  # hot reload
    depends_on: [db, redis]

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: ambulance_db
      POSTGRES_PASSWORD: postgres
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  postgres_data:
```

---

## 10. Phased Build Timeline for Cursor

**Total Estimated Duration: 5–6 Weeks for Full Backend MVP**

### Phase 1 — Foundation & Auth `Week 1`
Project setup, Docker, DB config, all entities, Auth module (OTP + JWT), User module, Swagger setup.

### Phase 2 — Driver & Ambulance `Week 2`
Driver registration, document upload (S3), admin approval workflow, Ambulance module, nearby query.

### Phase 3 — Booking & Dispatch `Week 2–3`
Fare calculation, booking creation, dispatch algorithm, Socket.IO gateway for ride requests, driver acceptance flow.

### Phase 4 — Ride & Tracking `Week 3–4`
Ride lifecycle state machine, OTP verification, GPS tracking, Firebase integration, live location broadcasting.

### Phase 5 — Payments & Wallet `Week 4`
Razorpay integration, payment verification webhook, driver wallet auto-credit, commission deduction, weekly payout cron.

### Phase 6 — Admin, Analytics & Extras `Week 5`
Admin dashboard, all management APIs, analytics queries, notifications (FCM), chat module, fraud detection.

### Phase 7 — Testing, Docs & Deploy `Week 6`
Jest unit + integration tests, Swagger docs complete, Docker production build, AWS ECS deployment, smoke testing.

---

### Phase 1 — Day-by-Day Plan (Week 1)

| Day | Tasks |
|-----|-------|
| Day 1 | `nest new one-click-ambulance-api`, configure pnpm, ESLint/Prettier, Git. Install all dependencies. `docker-compose up`. |
| Day 2 | Create all 40 TypeORM entities in `database/entities/`. Run migrations. Verify schema in psql. |
| Day 3 | Build Auth module: send-otp, verify-otp. Redis OTP store. MSG91 SMS integration. Test with Postman. |
| Day 4 | Build JWT strategy, RolesGuard, `@Public` decorator. Add refresh token endpoint. Test all auth flows. |
| Day 5 | Build User module (profile, addresses). Wire up Swagger. Deploy to local Docker. Week 1 review. |

---

## 11. Cursor-Specific Workflow & Prompting Guide

### Recommended Cursor Settings

- Enable: Include entire codebase in context (for accurate suggestions across modules)
- Use Claude Sonnet or GPT-4o as the model (best for NestJS/TypeScript)
- Create a `.cursorrules` file in root (see template below)
- Use Cursor Chat tab for architecture questions, Inline Edit (`Cmd+K`) for code generation

### `.cursorrules` File Template

```
You are an expert NestJS TypeScript developer building a production ambulance booking platform.

ALWAYS follow these rules:
- Use NestJS best practices: modules, services, controllers, guards, interceptors
- Use TypeORM with PostgreSQL — never raw SQL strings, use query builder
- All DTOs must use class-validator decorators
- Implement proper error handling with HttpException and custom filters
- Use dependency injection — never instantiate services manually
- Add Swagger @ApiTags, @ApiOperation, @ApiResponse decorators to all controllers
- Use UUIDs for all primary keys
- Add proper TypeScript types — no 'any' type
- Follow async/await pattern — no .then() chains
- Add audit logging for all admin actions
- Always validate user ownership before data access
- Use environment variables for all secrets via ConfigService
```

### Example Cursor Prompts

**Auth Module:**
```
Create a NestJS Auth module with: OTP-based login (MSG91 SMS), JWT access tokens (15 min) +
refresh tokens (30 days stored in Redis), Passport JWT strategy, @Public decorator to skip auth,
RolesGuard with Role enum (ADMIN/DRIVER/USER). Include send-otp.dto.ts and verify-otp.dto.ts with
class-validator. Add Swagger decorators.
```

**Dispatch Algorithm:**
```
Create a NestJS DispatchService that: (1) takes a booking_id, (2) queries driver_locations joined
with driver_status WHERE is_online=true and ambulance_type matches, sorted by Haversine distance
within 10km, (3) emits a Socket.IO event ride:request to the nearest driver's room, (4) stores
the attempt in booking_driver_assignments, (5) starts a 15-second Redis TTL, (6) if no accept,
retries with next driver. Handle up to 5 retries.
```

**Razorpay Payment:**
```
Create a NestJS PaymentsModule with: (1) POST /payment/initiate that creates a Razorpay order
and returns order_id, (2) POST /payment/verify that validates HMAC-SHA256 signature
using razorpay_order_id + razorpay_payment_id + secret, (3) POST /payment/webhook that handles
payment.captured event, credits driver wallet via WalletService, deducts 20% commission.
Use @nestjs/config for Razorpay keys.
```

**Firebase Tracking:**
```
Create a NestJS TrackingService that on POST /driver/location/update: (1) validates the driver
is on an active ride, (2) saves to driver_locations PostgreSQL table, (3) writes to Firebase RTDB
path /rides/{booking_id}/driver_location with lat, lng, heading, updated_at, (4) emits Socket.IO
event tracking:location to room ride:{booking_id}. Include the TrackingGateway with proper
@WebSocketGateway decorator and CORS config.
```

### Cursor Workflow Tips

- Always open the relevant entity file + module file before asking Cursor to generate a service
- Use `Cmd+K` (inline edit) on an empty file with comment `// NestJS service for X module` to scaffold faster
- After generating each module, run: `npx tsc --noEmit` to catch type errors
- Use Cursor's multi-file context by `@mentioning` files
- Generate all DTOs first, then services, then controllers
- Ask Cursor to write Jest tests immediately after each service

---

## 12. Environment Variables & Config

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ambulance_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# SMS (MSG91)
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_ID=AMBLNC
MSG91_TEMPLATE_ID=your_template_id

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=one-click-ambulance-docs

# Razorpay
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Platform Config
PLATFORM_COMMISSION_PERCENT=20
DISPATCH_RADIUS_KM=10
DISPATCH_TIMEOUT_SECONDS=15
OTP_EXPIRY_MINUTES=5
```

> **IMPORTANT:** Create a `validation.schema.ts` using Joi that validates all required environment variables on app startup. This prevents silent failures when a required env var is missing in production.

---

## 13. Swagger API Documentation Setup

Swagger will be available at `http://localhost:3000/api/docs` in development.

All APIs are grouped into **named folders (tags)** so the docs are easy to navigate. Each tag corresponds to a feature group in the admin/driver/user flow.

---

### 13.1 Installation

```bash
pnpm add @nestjs/swagger swagger-ui-express
```

---

### 13.2 `main.ts` — Swagger Bootstrap

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ── Swagger Configuration ──────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('🚑 One Click Ambulance API')
    .setDescription(
      `
## One Click Ambulance — Backend API Reference

Production-grade REST API powering the ambulance booking platform.

### Authentication
All protected endpoints require a **Bearer JWT token** in the Authorization header:
\`Authorization: Bearer <access_token>\`

### Roles
- **ADMIN** — Admin web portal access
- **DRIVER** — Driver mobile app access  
- **USER** — Customer mobile app access
- **PUBLIC** — No authentication required

### Base URL
- Development: \`http://localhost:3000/api/v1\`
- Production: \`https://api.oneclickambulance.com/api/v1\`
      `,
    )
    .setVersion('1.0.0')
    .setContact('One Click Ambulance', 'https://oneclickambulance.com', 'dev@oneclickambulance.com')
    .setLicense('Private', '')
    // JWT Bearer auth button in Swagger UI
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-Auth', // This name is referenced in @ApiBearerAuth('JWT-Auth')
    )
    // ── API Tag Groups (folders in Swagger UI) ──────────────────────────────
    .addTag('Admin Auth',         '🔐 Admin login, logout, token refresh')
    .addTag('User Auth',          '🔐 Customer OTP login, logout, token refresh')
    .addTag('Driver Auth',        '🔐 Driver OTP login, logout, token refresh')
    .addTag('Users',              '👤 Customer profile and address management')
    .addTag('Drivers',            '🧑‍✈️ Driver registration, profile, documents, status')
    .addTag('Ambulances',         '🚑 Ambulance registration, types, nearby search')
    .addTag('Bookings',           '📋 Booking creation, fare estimation, history')
    .addTag('Dispatch',           '📡 Driver assignment algorithm, manual assign, retry')
    .addTag('Rides',              '🛣️ Ride lifecycle: start, end, OTP, status')
    .addTag('Tracking',           '📍 Driver GPS location updates, live tracking')
    .addTag('Payments',           '💳 Razorpay payment initiation and verification')
    .addTag('Wallet',             '💰 Driver wallet balance and transaction history')
    .addTag('Payouts',            '🏦 Weekly driver payout processing')
    .addTag('Ratings',            '⭐ Post-ride ratings and reviews')
    .addTag('Notifications',      '🔔 In-app notifications, FCM push, broadcast')
    .addTag('Chat',               '💬 In-ride chat between user and driver')
    .addTag('Admin Dashboard',    '📊 Metrics, KPIs, live monitoring')
    .addTag('Admin Drivers',      '👥 Driver approval, suspension, management')
    .addTag('Admin Ambulances',   '🚒 Ambulance approval and management')
    .addTag('Admin Bookings',     '📂 All bookings view, force cancel, reassign')
    .addTag('Admin Users',        '👤 User management, block/unblock')
    .addTag('Admin Pricing',      '💲 Fare rules and pricing configuration')
    .addTag('Admin Zones',        '🗺️ Service zone creation and assignment')
    .addTag('Admin Payouts',      '💸 Driver payout management and processing')
    .addTag('Admin Notifications','📣 Broadcast notifications to users/drivers')
    .addTag('Analytics',          '📈 Revenue, rides, utilization analytics')
    .addTag('Reports',            '📑 Generate and export reports')
    .addTag('Fraud Detection',    '🚨 GPS anomalies, fake location, duplicate accounts')
    .addTag('Support',            '🎫 Support tickets and messaging')
    .addTag('System',             '⚙️ System settings, health check, app version')
    .addTag('Audit Logs',         '📜 Admin action audit trail')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,        // keeps token between page refreshes
      tagsSorter: 'alpha',               // sorts tag folders alphabetically
      operationsSorter: 'alpha',         // sorts endpoints alphabetically within folders
      docExpansion: 'none',              // all folders collapsed by default
      filter: true,                      // shows search box
      showRequestDuration: true,         // shows how long each request takes
    },
    customSiteTitle: '🚑 One Click Ambulance API Docs',
    customfavIcon: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/72x72/1f691.png',
    customCss: `
      .swagger-ui .topbar { background-color: #1D1D2C; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { color: #E63946; }
    `,
  });

  // Disable Swagger in production
  if (process.env.NODE_ENV === 'production') {
    // comment out SwaggerModule.setup above OR use:
    // if (process.env.ENABLE_SWAGGER === 'true') { ... }
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚑 API running at: http://localhost:${process.env.PORT ?? 3000}/api/v1`);
  console.log(`📚 Swagger docs: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
```

---

### 13.3 Controller Tagging — Full Reference

Every controller uses `@ApiTags('Tag Name')` to place it inside the correct folder in Swagger UI. Use `@ApiBearerAuth('JWT-Auth')` on any controller/endpoint that requires authentication.

#### Admin Auth Controller

```typescript
// src/modules/auth/admin-auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin Auth')
@Controller('admin')
export class AdminAuthController {
  
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login with email and password' })
  @ApiBody({ schema: { example: { email: 'admin@ambulance.com', password: 'Admin@123' } } })
  @ApiResponse({ status: 200, description: 'Returns access_token and refresh_token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: AdminLoginDto) { ... }

  @Post('logout')
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Admin logout — revokes refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout() { ... }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh admin access token using refresh token' })
  @ApiBody({ schema: { example: { refresh_token: 'eyJhbGci...' } } })
  @ApiResponse({ status: 200, description: 'Returns new access_token' })
  refresh(@Body() dto: RefreshTokenDto) { ... }
}
```

#### User Auth Controller

```typescript
// src/modules/auth/auth.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('User Auth')
@Controller('auth')
export class AuthController {

  @Public()
  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to user mobile number' })
  @ApiBody({ schema: { example: { mobile_number: '+919876543210', role: 'USER' } } })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests — rate limited' })
  sendOtp(@Body() dto: SendOtpDto) { ... }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and receive JWT tokens' })
  @ApiBody({ schema: { example: { mobile_number: '+919876543210', otp: '123456', role: 'USER' } } })
  @ApiResponse({ status: 200, description: 'Returns { access_token, refresh_token, user }' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) { ... }

  @Post('logout')
  @ApiBearerAuth('JWT-Auth')
  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  logout() { ... }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Get new access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) { ... }
}
```

#### Driver Auth Controller

```typescript
@ApiTags('Driver Auth')
@Controller('auth/driver')
export class DriverAuthController {
  // Same OTP endpoints as User Auth but scoped to DRIVER role
  // POST /auth/driver/send-otp
  // POST /auth/driver/verify-otp
  // POST /auth/driver/logout
  // POST /auth/driver/refresh
}
```

#### Users Controller

```typescript
@ApiTags('Users')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.USER)
@Controller('user')
export class UsersController {

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user object' })
  getProfile(@CurrentUser() user: User) { ... }

  @Put('profile/update')
  @ApiOperation({ summary: 'Update user name or email' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) { ... }

  @Get('addresses')
  @ApiOperation({ summary: 'Get all saved addresses for the user' })
  getAddresses(@CurrentUser() user: User) { ... }

  @Post('add-address')
  @ApiOperation({ summary: 'Add a new saved address' })
  addAddress(@CurrentUser() user: User, @Body() dto: AddAddressDto) { ... }

  @Delete('address/:id')
  @ApiOperation({ summary: 'Delete a saved address by ID' })
  @ApiParam({ name: 'id', description: 'Address UUID' })
  deleteAddress(@Param('id') id: string) { ... }
}
```

#### Bookings Controller

```typescript
@ApiTags('Bookings')
@ApiBearerAuth('JWT-Auth')
@Controller('booking')
export class BookingsController {

  @Post('create')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Create a new ambulance booking — triggers dispatch algorithm' })
  @ApiResponse({ status: 201, description: 'Booking created, dispatch started' })
  @ApiResponse({ status: 400, description: 'No available ambulances in range' })
  createBooking(@Body() dto: CreateBookingDto) { ... }

  @Get('estimate-fare')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get fare estimate before confirming booking' })
  @ApiQuery({ name: 'pickup_lat', type: Number })
  @ApiQuery({ name: 'pickup_lng', type: Number })
  @ApiQuery({ name: 'drop_lat', type: Number })
  @ApiQuery({ name: 'drop_lng', type: Number })
  @ApiQuery({ name: 'ambulance_type_id', type: String })
  estimateFare(@Query() query: EstimateFareDto) { ... }

  @Get('history')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get paginated booking history for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  getHistory(@CurrentUser() user: User, @Query() query: PaginationDto) { ... }

  @Post('cancel/:id')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Cancel a pending or active booking' })
  @ApiParam({ name: 'id', description: 'Booking UUID' })
  cancelBooking(@Param('id') id: string) { ... }
}
```

#### Admin Dashboard Controller

```typescript
@ApiTags('Admin Dashboard')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminDashboardController {

  @Get('dashboard')
  @ApiOperation({ summary: 'Get real-time dashboard metrics and KPIs' })
  @ApiResponse({
    status: 200,
    description: 'Returns rides_today, active_rides, revenue_today, active_drivers, avg_response_time',
    schema: {
      example: {
        rides_today: 142,
        active_rides: 7,
        completed_today: 135,
        revenue_today: 84200,
        active_drivers: 23,
        avg_response_time_seconds: 48,
      },
    },
  })
  getDashboard() { ... }

  @Get('system-health')
  @ApiOperation({ summary: 'Check API, DB, Redis, Firebase connectivity' })
  getSystemHealth() { ... }
}
```

#### Admin Drivers Controller

```typescript
@ApiTags('Admin Drivers')
@ApiBearerAuth('JWT-Auth')
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminDriversController {

  @Get('drivers')
  @ApiOperation({ summary: 'List all drivers with filters and pagination' })
  @ApiQuery({ name: 'status', enum: ['pending', 'approved', 'suspended'], required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search by name or mobile' })
  getDrivers(@Query() query: GetDriversQueryDto) { ... }

  @Post('driver/approve/:id')
  @ApiOperation({ summary: 'Approve a pending driver registration' })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @ApiResponse({ status: 200, description: 'Driver approved, FCM notification sent' })
  approveDriver(@Param('id') id: string) { ... }

  @Post('driver/reject/:id')
  @ApiOperation({ summary: 'Reject a driver application with reason' })
  @ApiParam({ name: 'id', description: 'Driver UUID' })
  @ApiBody({ schema: { example: { reason: 'Documents are unclear. Please resubmit.' } } })
  rejectDriver(@Param('id') id: string, @Body() dto: RejectDriverDto) { ... }

  @Post('driver/suspend/:id')
  @ApiOperation({ summary: 'Suspend an active driver account' })
  suspendDriver(@Param('id') id: string, @Body() dto: SuspendDriverDto) { ... }

  @Post('block-driver/:id')
  @ApiOperation({ summary: 'Permanently block a driver account' })
  blockDriver(@Param('id') id: string) { ... }

  @Post('unblock-driver/:id')
  @ApiOperation({ summary: 'Unblock a previously blocked driver' })
  unblockDriver(@Param('id') id: string) { ... }
}
```

#### Analytics Controller

```typescript
@ApiTags('Analytics')
@ApiBearerAuth('JWT-Auth')
@Roles(Role.ADMIN)
@Controller('analytics')
export class AnalyticsController {

  @Get('daily-rides')
  @ApiOperation({ summary: 'Get total rides count for a specific date' })
  @ApiQuery({ name: 'date', type: String, example: '2026-03-11', description: 'YYYY-MM-DD format' })
  getDailyRides(@Query('date') date: string) { ... }

  @Get('revenue-summary')
  @ApiOperation({ summary: 'Get platform revenue summary with date range filter' })
  @ApiQuery({ name: 'from', type: String, example: '2026-03-01' })
  @ApiQuery({ name: 'to', type: String, example: '2026-03-31' })
  getRevenueSummary(@Query() query: DateRangeDto) { ... }

  @Get('top-drivers')
  @ApiOperation({ summary: 'Get top performing drivers by rides and earnings' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'all_time'], required: false })
  @ApiQuery({ name: 'limit', type: Number, example: 10 })
  getTopDrivers(@Query() query: TopDriversQueryDto) { ... }

  @Get('zone-demand')
  @ApiOperation({ summary: 'Get ride demand heatmap data per service zone' })
  getZoneDemand() { ... }
}
```

---

### 13.4 DTO Swagger Decorators

DTOs use `@ApiProperty` to document fields in the Swagger UI request body:

```typescript
// src/modules/bookings/dto/create-booking.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '12.9716', description: 'Pickup latitude' })
  @IsNumber()
  pickup_latitude: number;

  @ApiProperty({ example: '77.5946', description: 'Pickup longitude' })
  @IsNumber()
  pickup_longitude: number;

  @ApiProperty({ example: '12.9279', description: 'Drop latitude' })
  @IsNumber()
  drop_latitude: number;

  @ApiProperty({ example: '77.6271', description: 'Drop longitude' })
  @IsNumber()
  drop_longitude: number;

  @ApiProperty({ example: 'HSR Layout, Bengaluru', description: 'Human-readable pickup address' })
  @IsString()
  pickup_address: string;

  @ApiProperty({ example: 'Manipal Hospital, Old Airport Road', description: 'Human-readable drop address' })
  @IsString()
  drop_address: string;

  @ApiProperty({ example: 'uuid-of-ambulance-type', description: 'Ambulance type UUID (get from /ambulance/types)' })
  @IsUUID()
  ambulance_type_id: string;

  @ApiPropertyOptional({ example: true, description: 'Mark as emergency (applies emergency surcharge)' })
  @IsOptional()
  is_emergency?: boolean;
}
```

```typescript
// src/modules/auth/dto/send-otp.dto.ts
export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Mobile number with country code' })
  @IsPhoneNumber()
  mobile_number: string;

  @ApiProperty({ enum: Role, example: Role.USER, description: 'Role determines which user table to check' })
  @IsEnum(Role)
  role: Role;
}
```

---

### 13.5 Swagger Entity Response Schemas

Use `@ApiResponse` with full schema examples for clean docs:

```typescript
// On any controller method:
@ApiResponse({
  status: 200,
  description: 'Booking details',
  schema: {
    example: {
      id: 'uuid-here',
      status: 'driver_accepted',
      pickup_address: 'HSR Layout, Bengaluru',
      drop_address: 'Manipal Hospital',
      estimated_fare: 850,
      final_fare: null,
      ambulance_type: { id: 'uuid', name: 'ICU' },
      driver: {
        id: 'uuid',
        name: 'Rajan Kumar',
        mobile_number: '+919876543210',
        ambulance_number: 'KA01AB1234',
      },
      created_at: '2026-03-11T10:30:00.000Z',
    },
  },
})
```

---

### 13.6 Complete Swagger Tag → Controller Mapping

| Swagger Tag (Folder) | Controller File | Prefix |
|---------------------|-----------------|--------|
| Admin Auth | `admin-auth.controller.ts` | `/admin` |
| User Auth | `auth.controller.ts` | `/auth` |
| Driver Auth | `driver-auth.controller.ts` | `/auth/driver` |
| Users | `users.controller.ts` | `/user` |
| Drivers | `drivers.controller.ts` | `/driver` |
| Ambulances | `ambulances.controller.ts` | `/ambulance` |
| Bookings | `bookings.controller.ts` | `/booking` |
| Dispatch | `dispatch.controller.ts` | `/dispatch` |
| Rides | `rides.controller.ts` | `/ride` |
| Tracking | `tracking.controller.ts` | `/driver/location` |
| Payments | `payments.controller.ts` | `/payment` |
| Wallet | `wallet.controller.ts` | `/driver/wallet` |
| Payouts | `payout.controller.ts` | `/admin/payouts` |
| Ratings | `ratings.controller.ts` | `/rating` |
| Notifications | `notifications.controller.ts` | `/notifications` |
| Chat | `chat.controller.ts` | `/chat` |
| Admin Dashboard | `admin-dashboard.controller.ts` | `/admin` |
| Admin Drivers | `admin-drivers.controller.ts` | `/admin` |
| Admin Ambulances | `admin-ambulances.controller.ts` | `/admin` |
| Admin Bookings | `admin-bookings.controller.ts` | `/admin` |
| Admin Users | `admin-users.controller.ts` | `/admin` |
| Admin Pricing | `admin-pricing.controller.ts` | `/admin/pricing` |
| Admin Zones | `admin-zones.controller.ts` | `/admin/zones` |
| Admin Notifications | `admin-notifications.controller.ts` | `/admin/notify` |
| Analytics | `analytics.controller.ts` | `/analytics` |
| Reports | `reports.controller.ts` | `/reports` |
| Fraud Detection | `fraud.controller.ts` | `/fraud` |
| Support | `support.controller.ts` | `/support` |
| System | `system.controller.ts` | `/system` |
| Audit Logs | `audit.controller.ts` | `/admin/audit-logs` |

---

### 13.7 Quick Swagger Access URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/api/docs` | Full interactive Swagger UI |
| `http://localhost:3000/api/docs-json` | Raw OpenAPI JSON spec |
| `http://localhost:3000/api/docs-yaml` | Raw OpenAPI YAML spec |

> The JSON spec can be imported into Postman, Insomnia, or shared with the Flutter/React frontend team so they can auto-generate API client code.

---

*🚑 One Click Ambulance — Admin Backend Build Plan · Ready to build with Cursor*