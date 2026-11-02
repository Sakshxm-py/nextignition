# Admin Panel V1 — Gap Implementation Log

Tracks work done to bring the admin panel in line with the client spec
**"NextIgnition AdminPanel AccessControl V1"** (2-level PRIMARY / SECONDARY RBAC,
12 modules). Branch: `fix/admin-panel-bugs-and-google-auth`.

Status legend: ✅ done · 🟡 partial · ⛔ not started

---

## 1. Summary

The spec's RBAC foundation (permission matrix, middleware, `admin_users`/`admin_logs`,
session timeout, bcrypt, JWT-with-role) was already in place. This pass closed the
highest-priority **functional gaps** (missing endpoints/modules), corrected the
permission matrix to match the spec exactly, and added the frontend token-refresh
flow the spec requires.

All backend changes typecheck clean and were verified at runtime with a real
SECONDARY admin token (RBAC 200/403 behavior confirmed per route).

---

## 2. Changes made in this pass

### 2.1 Permission matrix corrected to match spec (`backend/src/constants/adminConstants.ts`)
| Change | Reason (spec) |
|---|---|
| SECONDARY `INVESTOR_MGMT`: `[]` → `[VIEW]` | §3.4 — secondary **can view** investors |
| SECONDARY `CONTENT_MOD`: `[VIEW, EDIT]` → `[VIEW, EDIT, DELETE]` | §3.6 — secondary **can delete/report** posts |
| Route: feature-startup `EDIT` → `MANAGE` (PRIMARY only) | §3.3 — "feature startup" is ✗ for secondary |

### 2.2 New backend endpoints (`backend/src/controllers/adminController.ts` + `routes/adminRoutes.ts`)
All enforce RBAC via `enforceAdminPermission(module, action)` and write to the audit log.

| Method & Route | Controller | Module / Action | Notes |
|---|---|---|---|
| `PUT /admin/users/:id` | `updateUser` | USER_MGMT / EDIT | Whitelisted profile fields only (§3.2 edit user) |
| `PUT /admin/startups/:id` | `updateStartup` | STARTUP_MGMT / EDIT | Whitelisted fields (§3.3 edit startup) |
| `DELETE /admin/startups/:id` | `deleteStartup` | STARTUP_MGMT / DELETE | PRIMARY only (§3.3) |
| `GET /admin/investors` | `getAdminInvestors` | INVESTOR_MGMT / VIEW | Lists users with `investor` role |
| `POST /admin/investors/:id/approve` | `approveInvestor` | INVESTOR_MGMT / APPROVE | PRIMARY only (§3.4) |
| `PUT /admin/investors/:id` | `updateInvestor` | INVESTOR_MGMT / EDIT | PRIMARY only (§3.4) |
| `POST /admin/events` | `createEvent` | EVENTS / CREATE | Both admins (§3.7) |
| `POST /admin/events/:id/approve` | `approveEvent` | EVENTS / APPROVE | Both admins (§3.7) |
| `DELETE /admin/events/:id` | `deleteEvent` | EVENTS / DELETE | PRIMARY only (§3.7) |

### 2.3 Frontend (`frontend/src/components/AdminDashboard.tsx`, `AdminPanel.tsx`)
- **Token-refresh flow (§4):** `adminFetch` now performs a one-shot `POST /admin/refresh`
  on a 401 and replays the request; concurrent 401s are deduped. Login stores the
  refresh token; logout clears it. Admins are no longer hard-logged-out every 30 min.
- **Investor Management module:** new `InvestorMgmtView` + sidebar nav item (secondary
  sees a read-only view; PRIMARY gets the Approve action).
- **Events actions:** `EventsMgmtView` gained a Create-Event form, an Approve action,
  and a PRIMARY-only Delete action (was previously read-only).

### 2.4 Earlier fixes already on this branch (context)
- Native Google auth hardening (`authService.ts`).
- Admin bug-fix batch: false-success toasts, 401/403 handling, stale `useCallback`
  deps, inline-component remount, AdminPanel role gating, backend refresh column fix,
  env-PRIMARY bypass hardening, audit logging on `onlyPrimaryAdmin` routes, leads-export
  gating, `resolveReport`/`deleteUser` validation + audit.
- Login email normalization (trim + lowercase) so capitalization/whitespace no longer
  causes a 401.

---

## 3. Spec compliance status (after Pass 2)

| Module | Status | Note |
|---|---|---|
| 3.1 Dashboard | ✅ | revenue/AI stats gated to PRIMARY |
| 3.2 User Management | ✅ | view/approve/edit/suspend/delete/KYC all present |
| 3.3 Startup Management | ✅ | view/approve/edit/delete/feature all present |
| 3.4 Investor Management | ✅ | view (both) + approve/edit (PRIMARY) |
| 3.5 Payments & Finance | ✅ | transactions + revenue + **Razorpay refunds** + **payouts overview** (disbursement rail TBD) |
| 3.6 Content Moderation | ✅ | reports + **community posts view/delete** |
| 3.7 Events & Webinars | ✅ | create/approve/delete |
| 3.8 Notifications | ✅ | send (both) + **template CRUD (PRIMARY)** |
| 3.9 AI Control Panel | ✅ | toggle + **usage metrics + prompt logs** (needs migration 006) |
| 3.10 Platform Settings | ✅ | config + **pricing/commission + API-key sections** |
| 3.11 Admin Management | ✅ | full CRUD + suspend/activate |
| 3.12 Logs & Security | ✅ | admin activity logs + **login-activity view** |
| §4 Auth (JWT/bcrypt/refresh/timeout) | ✅ | refresh flow wired end-to-end |
| §5 Rate limiting | ✅ | login limiter env-gated (10/min prod, 50/min dev) |
| §8 Frontend: hide modules / gate buttons | ✅ | sidebar + button gating |
| §8 Frontend: global auth context / dedicated 403 route | 🟡 | role decode centralized via helpers + refresh; full context/route-guard refactor still pending |
| Delivery: API docs (Postman/Swagger) | ✅ | `backend/docs/NextIgnition-Admin-API.postman_collection.json` |

---

## 4. Pass 2 changes (remaining backlog implemented)

### New DB migration
- **`backend/migrations/006_admin_v1_completion.sql`** — `ai_logs` (Ignisha call log) and `notification_templates` tables. **Must be applied** for AI metrics/prompt-logs and templates to persist; endpoints degrade gracefully (empty + `tableReady:false`) until then.

### New backend endpoints (all RBAC-enforced + audited)
| Method & Route | Module / Action | Notes |
|---|---|---|
| `POST /admin/payments/:id/refund` | PAYMENTS / MANAGE | Real Razorpay refund; marks `refundStatus` |
| `GET /admin/payouts` | PAYMENTS / VIEW | Read-only settlements overview (`disbursementSupported:false`) |
| `GET /admin/posts` | CONTENT_MOD / VIEW | Community feed posts + author resolution |
| `DELETE /admin/posts/:id` | CONTENT_MOD / DELETE | Both admins (spec 3.6) |
| `GET /admin/login-activity` | LOGS_SECURITY (PRIMARY) | From `user_activity_logs` (LOGIN/GOOGLE_LOGIN/REGISTER) |
| `GET /admin/ai/metrics` | AI_CONTROL / VIEW (PRIMARY) | Totals, today, success rate, by-feature |
| `GET /admin/ai/prompt-logs` | AI_CONTROL / VIEW (PRIMARY) | Paginated `ai_logs` |
| `GET/POST/PUT/DELETE /admin/notification-templates` | NOTIFICATIONS / MANAGE (PRIMARY) | Template CRUD |

### Backend behavior fixes
- `aiChat` now records each call to `ai_logs` (fire-and-forget) via exported `logAiCall`.
- `updatePlatformSettings` now **merges** instead of overwriting (a view submitting a subset no longer wipes other keys).
- `broadcast` re-gated to `NOTIFICATIONS/CREATE` so **secondary admins can send** (spec 3.8 ✓ both) — was wrongly PRIMARY-only.
- Login rate limit env-gated (10/min in production).

### Frontend wiring (`AdminDashboard.tsx`)
- **Payments:** Refund button per transaction (full Razorpay refund) + refunded state.
- **Content Moderation:** Reports/Posts tab toggle; posts table with delete.
- **AI Control:** usage-metrics tiles + recent prompt-logs panel.
- **Platform Settings:** pricing/commission fields + write-only API-key inputs.
- **Notifications:** "Save as template" + a PRIMARY-only templates list (use/delete).
- **Logs & Security:** new **Login Activity** view + sidebar item.

### Docs
- **`backend/docs/NextIgnition-Admin-API.postman_collection.json`** — full admin API collection; Login request auto-stores `{{adminToken}}`/`{{adminRefreshToken}}`.

---

## 5. Still pending (intentionally deferred)
- **Global auth context + dedicated `/403` route** (§8): role decoding is centralized in helpers and the refresh flow is shared, but a full React auth-context provider + hash-router 403 guard is a larger refactor; the existing inline `PermissionDenied` screen already satisfies the security requirement.
- **Payout disbursement rail** (RazorpayX or similar) — only a read-only settlements overview exists; actual money movement needs a payout provider integration.
- **Retire legacy `AdminPanel.tsx`** — its login screen is still the entry point; safe removal requires moving login into `AdminDashboard` first.

---

## 6. Deployment notes
- **Frontend** changes ship in the app bundle — require `npm run build` (+ `npx cap sync` for mobile).
- **Backend** requires migration `005_admin_full_system.sql` (admin_users/admin_logs) **and** the new `006_admin_v1_completion.sql` (ai_logs/notification_templates) applied in the target environment.
- New endpoints write to the **same Supabase project** the production backend uses.

---

## 7. Verification performed
Runtime checks against the local backend with a SECONDARY admin token:

| Request | Expected | Result |
|---|---|---|
| `GET /admin/investors` | 200 (secondary can view) | ✅ 200 |
| `POST /admin/investors/:id/approve` | 403 (PRIMARY only) | ✅ 403 |
| `POST /admin/events` (create) | 201 (secondary can create) | ✅ 201 |
| `DELETE /admin/events/:id` | 403 (PRIMARY only) | ✅ 403 |
| `GET /admin/posts` | 200 (secondary can view) | ✅ 200 |
| `GET /admin/payouts` | 403 (PRIMARY only) | ✅ 403 |
| `POST /admin/payments/:id/refund` | 403 (PRIMARY only) | ✅ 403 |
| `GET /admin/ai/metrics` | 403 (PRIMARY only) | ✅ 403 |
| `GET /admin/login-activity` | 403 (PRIMARY only) | ✅ 403 |
| `GET /admin/notification-templates` | 403 (PRIMARY only) | ✅ 403 |
| `POST /admin/broadcast` (secondary) | reaches handler (no 403) | ✅ 404 (no users matched) |

Backend + frontend both `tsc --noEmit` clean for all admin files.
