import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('One Click Ambulance API')
    .setDescription(
      `## One Click Ambulance — Centralized Backend API

Serves three clients: **Customer Flutter App**, **Driver Flutter App**, **Admin React Portal**.

### Base URL
All endpoints are prefixed with \`/api/v1\`

### Authentication
| Client | Method | Token |
|--------|--------|-------|
| **User / Driver** | OTP-based login | JWT Bearer token |
| **Admin** | Email + Password | JWT Bearer token |

Include \`Authorization: Bearer <access_token>\` on all protected routes.

### Roles
- \`user\` — Customer app (send-otp, verify-otp, refresh, logout)
- \`driver\` — Driver app (send-otp, verify-otp, refresh, logout)
- \`admin\` — Admin portal (dashboard, users, drivers, bookings management)
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
      'access-token',
    )
    // Auth modules — order defines Swagger UI display order
    .addTag(
      'User — Auth',
      'Customer app: OTP-based authentication (send-otp, verify-otp, refresh, logout)',
    )
    .addTag(
      'User — Profile',
      'Customer profile, register after OTP, device tokens',
    )
    .addTag('User — Addresses', 'Saved pickup/drop addresses')
    .addTag(
      'User — Ambulance',
      'Ambulance types, nearby (dispatch radius), vehicle details',
    )
    .addTag(
      'User — Booking',
      'Fare estimate and (later) booking lifecycle for customers',
    )
    .addTag('User — Ride', 'Ride details, status, OTP, live location')
    .addTag('User — Payment', 'Razorpay order, verify, payment history')
    .addTag('User — Rating', 'Submit driver rating after trip')
    .addTag('User — Notifications', 'In-app / FCM delivery inbox')
    .addTag('User — Chat', 'Booking chat and call logging')
    .addTag('User — Invoice', 'PDF invoice download')
    .addTag('User — Support', 'Customer support tickets')
    .addTag(
      'User — System (public)',
      'Public app config: settings + version check (no auth)',
    )
    .addTag(
      'Driver — Auth',
      'Driver app: OTP-based authentication (send-otp, verify-otp, refresh, logout)',
    )
    .addTag(
      'Driver — Rides',
      'Driver accept/reject customer ride offers (customer auto-dispatch uses `/driver/*`, not `/dispatch/*`)',
    )
    .addTag('Admin — Auth', 'Admin portal: Email + password authentication')
    // Admin modules
    .addTag('Admin — Dashboard', 'Dashboard metrics and system overview')
    .addTag('Admin — User Management', 'User blocking and management')
    .addTag(
      'Admin — Driver Management',
      'Driver approval, suspension, blocking',
    )
    .addTag('Admin — Bookings', 'Booking list and management')
    .addTag(
      'Admin — Ambulance Management',
      'Ambulance approval, suspension, restore',
    )
    .addTag(
      'Admin — Payments & Finance',
      'Payments listing, Razorpay sync, reconciliation, revenue',
    )
    .addTag('Admin — Payouts', 'Driver wallet payouts and payout history')
    .addTag(
      'Admin — Analytics',
      'Phase 7.2: rides, revenue, utilization, cancellations, demand',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'One Click Ambulance API Docs',
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(
    `\n🚑 One Click Ambulance API running on: http://localhost:${port}/api/v1`,
  );
  console.log(`📖 Swagger Docs available at: http://localhost:${port}/docs\n`);
}

bootstrap();
