# Admin Backend — Progress Tracker

> **Status:** Auth ✅ | User Listing ✅ | Driver Listing ✅

---

## Phase 1 — Driver & Ambulance Management

### 1.1 Driver Management APIs ✅
| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 1 | POST | `/admin/driver/approve` | ✅ |
| 2 | POST | `/admin/driver/reject` | ✅ |
| 3 | POST | `/admin/driver/suspend` | ✅ |
| 4 | POST | `/admin/block-driver` | ✅ |
| 5 | POST | `/admin/unblock-driver` | ✅ |
| 6 | GET | `/admin/drivers/:id` | ✅ |

**Implemented:**
- DTOs: `DriverIdDto`, `RejectDriverDto` (optional reason)
- Audit logging for all status changes (admin_id, action, entity_type, entity_id)
- FCM notification on approval (no-op service, ready for Firebase integration)
- GET `/admin/drivers/:id` returns full driver detail with `driver_documents` and `driver_bank_accounts`
- Entities: `DriverDocument`, `DriverBankAccount`
- Validation and proper interfaces (no `any`)

### 1.2 Ambulance Management APIs ✅
| # | Method | Endpoint | Status |
|---|--------|----------|--------|
| 7 | POST | `/admin/ambulance/approve` | ✅ |
| 8 | POST | `/admin/ambulance/suspend` | ✅ |
| 9 | POST | `/admin/suspend-ambulance` | ✅ (alias with extended reason) |
| 10 | POST | `/admin/restore-ambulance` | ✅ |
| 11 | GET | `/admin/ambulances` | ✅ |
| 12 | GET | `/admin/ambulances/:id` | ✅ |

**Implemented:**
- Entities: `Ambulance`, `AmbulanceType`, `AmbulanceEquipment`
- DTOs: `AmbulanceIdDto`, `SuspendAmbulanceDto`, `AmbulanceListQueryDto`
- Audit logging for all write operations
- List supports filters: page, limit, status, ambulance_type_id, driver_id, search
- Detail endpoint returns ambulance with type, driver, and equipment list
- Proper interfaces throughout (no `any`)

---

## Phase 2 — User Management
*Next up*

---

## Phase 3+ — See plan.md
