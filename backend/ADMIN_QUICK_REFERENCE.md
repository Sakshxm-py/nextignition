# 2-Level Admin RBAC - Quick Reference Guide

## Login & Authentication

### Login Endpoint
```bash
POST /admin/login
Content-Type: application/json

{
  "email": "admin@nextignition.io",
  "password": "your_password"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "displayName": "Admin Name",
  "username": "admin@nextignition.io",
  "role": "PRIMARY_ADMIN",
  "expiresIn": "30m"
}
```

### Refresh Token Endpoint
```bash
POST /admin/refresh
Cookie: admin_refresh_token=<refresh_token>

Response:
{
  "accessToken": "new_access_token...",
  "refreshToken": "new_refresh_token...",
  "expiresIn": "30m"
}
```

### Using Admin Token
```bash
GET /admin/users
Authorization: Bearer <token_from_login>
```

---

## Admin Management (PRIMARY_ADMIN ONLY)

### Create Secondary Admin
```bash
POST /admin/admins
Authorization: Bearer <primary_token>
Content-Type: application/json

{
  "email": "ops@nextignition.io",
  "password": "strong_password_123",
  "name": "Operations Manager",
  "role": "SECONDARY_ADMIN"
}

Response: 201 Created
{
  "admin": {
    "id": "uuid",
    "email": "ops@nextignition.io",
    "name": "Operations Manager",
    "role": "SECONDARY_ADMIN",
    "created_at": "2026-04-14T..."
  }
}
```

### List All Admins
```bash
GET /admin/admins?page=1&limit=20&status=active
Authorization: Bearer <primary_token>

Response:
{
  "admins": [
    {
      "id": "uuid",
      "email": "admin@nextignition.io",
      "name": "Admin Name",
      "role": "PRIMARY_ADMIN",
      "status": "active",
      "created_at": "...",
      "last_login": "..."
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### Update Admin
```bash
PUT /admin/admins/:adminId
Authorization: Bearer <primary_token>
Content-Type: application/json

{
  "role": "PRIMARY_ADMIN",  // Promote/demote
  "name": "New Name",
  "status": "suspended"
}

Response: 200 OK
```

### Suspend Admin
```bash
POST /admin/admins/:adminId/suspend
Authorization: Bearer <primary_token>
Content-Type: application/json

{
  "reason": "No longer with company"
}

Response: 200 OK
```

### Delete Admin
```bash
DELETE /admin/admins/:adminId
Authorization: Bearer <primary_token>

Response: 200 OK
```

---

## User Management

### View Users (Both Roles)
```bash
GET /admin/users?page=1&limit=20&search=john
Authorization: Bearer <token>

Response: 200 OK
```

### Freeze/Unfreeze User (Both Roles)
```bash
POST /admin/freeze/:userId
Authorization: Bearer <token>

POST /admin/unfreeze/:userId
Authorization: Bearer <token>
```

### Delete User (PRIMARY_ADMIN ONLY)
```bash
DELETE /admin/delete/:userId
Authorization: Bearer <primary_token>

Response: 200 OK (PRIMARY)
Response: 403 Forbidden (SECONDARY → insufficient permissions)
```

### Verify User (Both Roles)
```bash
POST /admin/verify/:userId
Authorization: Bearer <token>
```

---

## Dashboard & Stats

### Dashboard (Both Roles - LIMITED for SECONDARY)
```bash
GET /admin/dashboard
Authorization: Bearer <token>

Response:
{
  "users": {
    "total": 1234,
    "founders": 450,
    "experts": 250,
    "investors": 100,
    "activeToday": 56
  },
  "revenue": {           // ← PRIMARY ONLY
    "total": 125000,
    "thisMonth": 25000,
    "transactions": 89
  },
  "events": { "total": 12 },
  "charts": {...}
}
```

If SECONDARY tries to access revenue stats → Still returns 200 OK but restricted fields hidden

---

## Role Management

### Get Pending Role Applications (Both Roles)
```bash
GET /admin/role-applications?status=pending&role=investor
Authorization: Bearer <token>
```

### Approve Role (Both Roles)
```bash
POST /admin/approve-role/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "investor",
  "badges": ["verified-investor"],
  "notes": "LinkedIn verified, profile complete"
}

Response: 200 OK
```

### Reject Role (Both Roles)
```bash
POST /admin/reject-role/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "expert",
  "reason": "Missing required certifications"
}

Response: 200 OK
```

### Suspend Role (PRIMARY_ADMIN ONLY)
```bash
POST /admin/suspend-role/:userId
Authorization: Bearer <primary_token>
Content-Type: application/json

{
  "role": "investor",
  "reason": "Violates platform policies"
}

Response: 200 OK (PRIMARY)
Response: 403 Forbidden (SECONDARY)
```

---

## Transactions & Payments (PRIMARY_ADMIN ONLY)

### View Transactions
```bash
GET /admin/transactions?page=1&limit=50
Authorization: Bearer <primary_token>

Response: 200 OK (PRIMARY)
Response: 403 Forbidden (SECONDARY)
```

---

## Audit Logs (PRIMARY_ADMIN ONLY)

### Query Activity Logs
```bash
GET /admin/activity-logs?adminId=<id>&module=USER_MGMT&action=DELETE&page=1
Authorization: Bearer <primary_token>

Response:
{
  "logs": [
    {
      "id": "uuid",
      "admin_id": "admin-uuid",
      "module": "USER_MGMT",
      "action": "DELETE",
      "target_id": "user-123",
      "change_summary": {
        "before": {...},
        "after": null,
        "reason": "..."
      },
      "timestamp": "2026-04-14T10:30:00Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 50
}
```

### Supported Modules
- DASHBOARD
- USER_MGMT
- STARTUP_MGMT
- INVESTOR_MGMT
- PAYMENTS
- CONTENT_MOD
- EVENTS
- NOTIFICATIONS
- AI_CONTROL
- PLATFORM_SETTINGS
- ADMIN_MGMT
- LOGS_SECURITY

### Supported Actions
- VIEW
- CREATE
- EDIT
- APPROVE
- REJECT
- SUSPEND
- DELETE
- MANAGE

---

## Permission Matrix Summary

### PRIMARY_ADMIN Can Do Everything

### SECONDARY_ADMIN Has Limited Access
- ✓ View users, startups, investors, content, events
- ✓ Approve/reject users, startups, roles
- ✓ Suspend users
- ✓ Create/approve events (but not delete)
- ✓ Send notifications (but not manage templates)
- ✓ Moderate content
- ✗ Delete anything (permanent actions)
- ✗ Access payments/transactions
- ✗ Manage AI/settings
- ✗ Create/manage other admins
- ✗ View audit logs

---

## Error Handling

### 401 Unauthorized
```json
{
  "message": "Admin token invalid or expired"
}
```
→ Solution: Re-login or use refresh token

### 403 Forbidden
```json
{
  "message": "Insufficient permissions to perform this action"
}
```
→ Solution: Not authorized for this operation (check admin role)

### 404 Not Found
```json
{
  "message": "Admin not found"
}
```
→ Solution: Invalid admin ID or user/resource doesn't exist

### 400 Bad Request
```json
{
  "message": "Cannot delete yourself"
}
```
→ Solution: Self-protection check - cannot modify own account

---

## Common Workflows

### Workflow 1: Onboard New SECONDARY_ADMIN
1. PRIMARY_ADMIN: `POST /admin/admins` with new email/password
2. Send credentials securely to new admin
3. New admin: `POST /admin/login` with those credentials
4. System: Issues JWT with role: SECONDARY_ADMIN
5. New admin: Limited UI shows only permitted modules

### Workflow 2: Approve New Investor Role
1. Founder applies for "investor" role
2. SECONDARY_ADMIN: Check `GET /admin/role-applications?role=investor`
3. SECONDARY_ADMIN: `POST /admin/approve-role/{userId}`
4. Investor receives email confirmation
5. Audit log: Admin approved investor role for user

### Workflow 3: Investigate Admin Activity
1. PRIMARY_ADMIN: `GET /admin/activity-logs?adminId={suspicious_id}`
2. Review timestamp, action, and change_summary
3. If malicious: `POST /admin/admins/{id}/suspend`
4. Suspended admin cannot login
5. Audit log: PRIMARY suspended SECONDARY admin

### Workflow 4: Recover Accidentally Deleted Data
1. Query `GET /admin/activity-logs?action=DELETE&module=USER_MGMT`
2. Find the target_id that was deleted
3. Contact PRIMARY_ADMIN to restore from backup
4. Log shows who deleted what and when

---

## Setup Instructions

### First Time Setup
1. Ensure `ADMIN_JWT_SECRET` environment variable is set
2. Ensure `ADMIN_CREDENTIALS` env has PRIMARY_ADMIN credentials
3. Run database migration: `003_admin_access_control.sql`
4. PRIMARY_ADMIN logs in via `POST /admin/login` using env credentials
5. PRIMARY_ADMIN creates secondary admins via `POST /admin/admins`

### Generate Admin Password Hash
```bash
node -e "require('bcryptjs').hash('YourPassword123!',10).then(console.log)"
# Output: $2b$10$abcdefghijklmnopqrstuvwxyz...

# Set in env:
ADMIN_CREDENTIALS=admin@example.com:$2b$10$abcd...:Admin Full Name
```

---

## Rate Limiting

**Admin Login Endpoint:** 50 requests per minute
- Prevents brute force attacks
- Returns 429 Too Many Requests if exceeded

**Other Endpoints:** Standard API rate limits

---

## Security Best Practices

1. ✓ **Keep tokens secure** - Never expose in logs/client code
2. ✓ **Use refresh tokens** - Access tokens are short-lived (30 min)
3. ✓ **Monitor activity logs** - Review admin_activity_logs regularly
4. ✓ **Suspend compromised accounts** - Immediately suspend if abuse suspected
5. ✓ **Rotate passwords** - Require regular password changes
6. ✓ **Use strong passwords** - Minimum 12 characters recommended

---

## Support

For issues or questions:
1. Check admin_activity_logs for what happened
2. Verify admin status: `GET /admin/admins`
3. Review API documentation in ADMIN_RBAC_IMPLEMENTATION.md
4. Contact PRIMARY_ADMIN for assistance
