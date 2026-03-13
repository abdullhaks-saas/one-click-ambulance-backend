# One Click Ambulance — Admin Backend Build Plan

> **Status:** Auth ✅ | User Listing ✅ | Driver Listing ✅ | Everything below → TO BUILD

---

## Overview

This plan covers all remaining Admin-side backend APIs grouped into logical build phases. Each phase is ordered by dependency — build data foundations before analytics, build management before reporting.

**Stack:** Node.js (Express/NestJS) · PostgreSQL · Firebase · JWT Auth · Razorpay

---

## Phase 1 — Driver & Ambulance Management
*Core operational control. Build first as other modules depend on driver/ambulance state.*

### 1.1 Driver Management APIs
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 1 | POST | `/admin/driver/approve` | Approve pending driver registration | `drivers`, `audit_logs` |
| 2 | POST | `/admin/driver/reject` | Reject driver with reason | `drivers`, `audit_logs` |
| 3 | POST | `/admin/driver/suspend` | Suspend active driver | `drivers`, `audit_logs` |
| 4 | POST | `/admin/block-driver` | Permanently block driver | `drivers`, `audit_logs` |
| 5 | POST | `/admin/unblock-driver` | Restore blocked driver | `drivers`, `audit_logs` |
| 6 | GET | `/admin/drivers/:id` | Full driver detail with documents | `drivers`, `driver_documents`, `driver_bank_accounts` |

**Notes:**
- All status changes must write to `audit_logs` (admin_id, action, entity, timestamp)
- Approval should trigger FCM push notification to driver via Firebase
- Rejection should accept an optional `reason` field in request body

### 1.2 Ambulance Management APIs
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 7 | POST | `/admin/ambulance/approve` | Approve ambulance registration | `ambulances`, `audit_logs` |
| 8 | POST | `/admin/ambulance/suspend` | Suspend ambulance | `ambulances`, `audit_logs` |
| 9 | POST | `/admin/suspend-ambulance` | Alias — suspend with extended reason | `ambulances`, `audit_logs` |
| 10 | POST | `/admin/restore-ambulance` | Restore suspended ambulance | `ambulances`, `audit_logs` |
| 11 | GET | `/admin/ambulances` | List all ambulances with filters | `ambulances`, `ambulance_types` |
| 12 | GET | `/admin/ambulances/:id` | Ambulance detail + equipment list | `ambulances`, `ambulance_equipment` |

---

## Phase 2 — User Management
*Depends on: Phase 1 pattern established*

| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 13 | POST | `/admin/block-user` | Block customer account | `users`, `audit_logs` |
| 14 | POST | `/admin/unblock-user` | Unblock customer account | `users`, `audit_logs` |
| 15 | GET | `/admin/users/:id` | Full user profile + ride history | `users`, `bookings` |

---

## Phase 3 — Booking & Ride Management
*Depends on: Phase 1 (driver states must be correct)*

### 3.1 Booking Management
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 16 | GET | `/admin/bookings` | All bookings with filters (status, date, zone) | `bookings`, `booking_status_history` |
| 17 | GET | `/admin/bookings/:id` | Full booking detail | `bookings`, `ride_details`, `payments` |
| 18 | POST | `/admin/force-cancel-ride` | Force cancel any active ride | `bookings`, `booking_status_history`, `audit_logs` |

### 3.2 Ride Management & Dispatch
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 19 | GET | `/admin/rides` | All rides with status filters | `ride_details`, `ride_status` |
| 20 | GET | `/admin/rides/:id` | Ride detail with tracking path | `ride_details`, `ride_tracking` |
| 21 | POST | `/dispatch/manual-assign` | Admin manually assigns driver to booking | `booking_driver_assignments`, `audit_logs` |
| 22 | POST | `/dispatch/cancel-assignment` | Cancel current driver assignment | `booking_driver_assignments` |
| 23 | GET | `/dispatch/available-drivers` | List available drivers in a zone | `driver_status`, `driver_locations`, `driver_zones` |
| 24 | GET | `/dispatch/find-driver` | Find nearest driver for a booking | `driver_locations`, `driver_status` |
| 25 | POST | `/dispatch/assign-driver` | Auto-assign nearest driver | `booking_driver_assignments` |
| 26 | POST | `/dispatch/retry-assignment` | Retry if driver rejected/timed out | `booking_driver_assignments` |
| 27 | POST | `/dispatch/driver-timeout` | Handle 15-second acceptance timeout | `booking_driver_assignments` |

**Notes:**
- `/dispatch/find-driver` must use PostGIS or haversine formula against `driver_locations` for 10km radius search
- Manual assign should push ride request notification to driver via Firebase

---

## Phase 4 — Pricing & Zone Management
*These are configuration APIs — no cross-dependencies, can be built in parallel with Phase 3*

### 4.1 Pricing Configuration
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 28 | GET | `/admin/pricing` | Get all pricing rules per ambulance type | `pricing_rules`, `ambulance_types` |
| 29 | POST | `/admin/pricing/update` | Update fare parameters | `pricing_rules`, `audit_logs` |
| 30 | GET | `/admin/pricing/:ambulance_type_id` | Pricing for specific ambulance type | `pricing_rules` |

**Pricing fields to support:** `base_fare`, `per_km_price`, `emergency_charge`, `night_charge`, `minimum_fare`

### 4.2 Zone Management
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 31 | POST | `/admin/zones/create` | Create new service zone with coordinates | `zones`, `zone_coordinates` |
| 32 | GET | `/admin/zones` | List all zones | `zones`, `zone_coordinates` |
| 33 | PUT | `/admin/zones/update` | Update zone name/boundary | `zones`, `zone_coordinates` |
| 34 | DELETE | `/admin/zones` | Delete a zone | `zones`, `zone_coordinates`, `driver_zones` |
| 35 | POST | `/admin/zones/:id/assign-driver` | Assign driver to a zone | `driver_zones` |
| 36 | GET | `/admin/zones/:id/drivers` | List drivers in a zone | `driver_zones`, `drivers` |

---

## Phase 5 — Payments & Finance Management
*Depends on: Phase 3 (rides and bookings must exist)*

### 5.1 Payment Overview
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 37 | GET | `/admin/payments` | All payment records with filters | `payments`, `payment_transactions` |
| 38 | GET | `/payments/failed-transactions` | List failed/pending payments | `payments` |
| 39 | POST | `/payments/retry-failed` | Trigger retry for failed payment | `payments`, `payment_transactions` |
| 40 | GET | `/payments/reconciliation` | Full reconciliation view | `payments`, `wallet_transactions` |
| 41 | POST | `/payments/reconcile-transaction` | Reconcile single transaction with Razorpay | `payment_transactions` |
| 42 | GET | `/payments/driver-commission` | Commission breakdown per driver | `wallet_transactions`, `driver_wallet` |
| 43 | GET | `/payments/platform-revenue` | Total platform revenue report | `payments`, `wallet_transactions` |

### 5.2 Driver Payouts
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 44 | GET | `/admin/payouts` | List all payout records | `payouts`, `payout_transactions` |
| 45 | POST | `/admin/payout/process` | Process weekly payout to driver bank | `payouts`, `payout_transactions`, `driver_bank_accounts` |
| 46 | GET | `/admin/payouts/:driver_id` | Payout history for a driver | `payouts` |

---

## Phase 6 — Notifications Management
*Depends on: Firebase FCM setup complete*

| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 47 | POST | `/admin/notify-drivers` | Send notification to specific driver(s) | `notifications`, `notification_logs` |
| 48 | POST | `/admin/notify-users` | Send notification to specific user(s) | `notifications`, `notification_logs` |
| 49 | POST | `/notifications/broadcast-users` | Broadcast to all users | `notifications`, `notification_logs` |
| 50 | POST | `/notifications/broadcast-drivers` | Broadcast to all drivers | `notifications`, `notification_logs` |
| 51 | GET | `/notifications/admin-history` | View full notification send history | `notification_logs` |
| 52 | POST | `/notifications/resend` | Resend failed notification | `notification_logs` |
| 53 | POST | `/notifications/test` | Test push notification to a device | — |

---

## Phase 7 — Analytics & Dashboard
*Depends on: Phases 3, 5 (needs real ride/payment data)*

### 7.1 Admin Dashboard
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 54 | GET | `/admin/dashboard` | Summary metrics (rides today, revenue, active drivers, avg response time) | `bookings`, `payments`, `driver_status` |

**Dashboard Response Shape:**
```json
{
  "total_rides_today": 0,
  "active_drivers": 0,
  "completed_rides": 0,
  "total_revenue": 0,
  "driver_utilization_rate": 0,
  "average_response_time_seconds": 0
}
```

### 7.2 Analytics APIs
| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 55 | GET | `/analytics/daily-rides` | Rides by day (date param) |
| 56 | GET | `/analytics/weekly-rides` | Weekly ride stats |
| 57 | GET | `/analytics/monthly-rides` | Monthly ride stats |
| 58 | GET | `/analytics/revenue-summary` | Revenue over time period |
| 59 | GET | `/analytics/driver-utilization` | Online time vs. ride time per driver |
| 60 | GET | `/analytics/average-response-time` | Avg driver acceptance time |
| 61 | GET | `/analytics/top-drivers` | Top N drivers by rides/earnings |
| 62 | GET | `/analytics/ride-cancellations` | Cancellation rate and reasons |
| 63 | GET | `/analytics/zone-demand` | Ride demand per zone |
| 64 | GET | `/analytics/ambulance-type-demand` | Demand per ambulance type |

**Query Params Pattern (consistent across all analytics):**
`?from=YYYY-MM-DD&to=YYYY-MM-DD&zone_id=&ambulance_type_id=`

---

## Phase 8 — Fraud Detection
*Depends on: Phase 3 (ride tracking data needed)*

| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 65 | GET | `/fraud/ride-anomalies` | Rides with unusual distance/time patterns | `ride_details`, `ride_tracking` |
| 66 | GET | `/fraud/gps-mismatch` | Rides where GPS path doesn't match route | `ride_tracking`, `bookings` |
| 67 | GET | `/fraud/fake-location-drivers` | Drivers with spoofed GPS patterns | `driver_locations` |
| 68 | GET | `/fraud/duplicate-accounts` | Users/drivers with duplicate mobile/PAN | `users`, `drivers` |
| 69 | POST | `/fraud/flag-driver` | Flag driver account for review | `drivers`, `audit_logs` |
| 70 | POST | `/fraud/flag-user` | Flag user account for review | `users`, `audit_logs` |

---

## Phase 9 — Reporting & Exports
*Depends on: Phases 5, 7*

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 71 | GET | `/reports/rides` | Ride report (filterable) |
| 72 | GET | `/reports/revenue` | Revenue report |
| 73 | GET | `/reports/drivers` | Driver performance report |
| 74 | GET | `/reports/payments` | Payment transaction report |
| 75 | GET | `/reports/cancellations` | Cancellation report |
| 76 | GET | `/reports/export` | Export any report as CSV/Excel |

**Export note:** Use `?format=csv` or `?format=xlsx` query param on `/reports/export`. Use `json2csv` or `exceljs` library.

---

## Phase 10 — System & Support Management
*Low dependency, can be built anytime after Phase 1*

### 10.1 System Settings
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 77 | GET | `/system/settings` | Get all system config values | `system_settings` |
| 78 | PUT | `/system/settings/update` | Update a setting by key | `system_settings`, `audit_logs` |
| 79 | POST | `/admin/update-system-setting` | Alias with admin audit trail | `system_settings`, `audit_logs` |
| 80 | GET | `/admin/system-health` | Platform health check (DB, Firebase, Razorpay) | — |
| 81 | POST | `/admin/maintenance-mode` | Toggle maintenance mode on/off | `system_settings` |

### 10.2 Monitoring & Logs
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 82 | GET | `/admin/error-logs` | View backend error logs | `error_logs` |
| 83 | GET | `/admin/audit-logs` | View admin action history | `audit_logs` |

### 10.3 Support Tickets
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 84 | GET | `/support/tickets` | List all support tickets | `support_tickets` |
| 85 | GET | `/support/tickets/:id` | Ticket detail with messages | `support_tickets`, `ticket_messages` |
| 86 | POST | `/support/message` | Admin replies to a ticket | `ticket_messages` |
| 87 | PUT | `/support/tickets/:id/status` | Update ticket status (open/closed) | `support_tickets` |

### 10.4 App Version Control
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 88 | GET | `/app/version` | Get current app version per platform | `app_versions` |
| 89 | POST | `/admin/app/version/update` | Push new version + mandatory flag | `app_versions` |

### 10.5 Live Map Monitoring
| # | Method | Endpoint | Description | Tables |
|---|--------|----------|-------------|--------|
| 90 | GET | `/admin/live-map` | All active driver locations + active rides | `driver_locations`, `driver_status`, `bookings` |

---

## Build Order Summary

```
Phase 1  →  Driver & Ambulance Management     (Week 1)
Phase 2  →  User Management                   (Week 1)
Phase 3  →  Booking, Ride & Dispatch          (Week 2)
Phase 4  →  Pricing & Zone Management         (Week 2)
Phase 5  →  Payments & Finance                (Week 3)
Phase 6  →  Notifications                     (Week 3)
Phase 7  →  Analytics & Dashboard             (Week 4)
Phase 8  →  Fraud Detection                   (Week 4)
Phase 9  →  Reports & Exports                 (Week 5)
Phase 10 →  System, Support & Monitoring      (Week 5)
```

---

## Common Patterns To Apply Across All APIs

### Standard Response Format
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Standard Query Filters (listing APIs)
All list endpoints should support:
- `?page=1&limit=20` — pagination
- `?status=` — filter by status
- `?from=&to=` — date range
- `?search=` — name/mobile search
- `?zone_id=` — zone filter (where applicable)

### Middleware Stack (every admin route)
```
verifyAdminJWT → checkAdminRole → rateLimiter → handler → auditLogger
```

### Audit Logging (all write operations)
Every POST/PUT/DELETE must insert into `audit_logs`:
```js
{ admin_id, action: 'APPROVE_DRIVER', entity: 'drivers', entity_id, created_at }
```

---

## Total Remaining APIs: ~90 endpoints across 10 phases