
# NextIgnition — Admin Panel Guide

*A plain-language overview of the NextIgnition Admin Panel and everything it lets your team do.*

---

## 1. What is the Admin Panel?

The Admin Panel is the **control room** for the entire NextIgnition platform. It is a secure, password-protected dashboard where your team can:

- See how the platform is performing at a glance (users, revenue, activity).
- Manage the people on the platform — founders, experts, and investors.
- Review and approve startups, investors, events, and content.
- Handle payments, refunds, and subscription pricing.
- Send announcements to users.
- Control platform-wide settings (like turning the site on/off for maintenance).
- Keep a permanent record of every action your team takes, for accountability.

Think of it as the back-office of the business — your customers never see it, but it is where the platform is run from day to day.

---

## 2. Who Can Use It — The Two Admin Levels

Not every team member should have the same powers. NextIgnition has **two levels of admin access** so you can give people exactly the responsibility they need — and nothing more.

| | **Primary Admin** (Owner-level) | **Secondary Admin** (Staff-level) |
|---|---|---|
| **Best for** | Founders / business owners | Operations & support staff |
| **Overall power** | Full control of everything | Day-to-day operations only |
| **Can manage other admins?** | ✅ Yes | ❌ No |
| **Can see money & finance?** | ✅ Yes | ❌ No |
| **Can change platform settings & AI?** | ✅ Yes | ❌ No |
| **Can view the activity/audit logs?** | ✅ Yes | ❌ No |
| **Can permanently delete users?** | ✅ Yes | ❌ No (can suspend, not delete) |
| **Can approve/manage users, startups, events, content?** | ✅ Yes | ✅ Yes |

**In short:**
- A **Primary Admin** can do *everything*, including creating new admins and seeing financial data.
- A **Secondary Admin** can run the day-to-day (approve members, moderate content, manage events) but **cannot** touch money, settings, the AI, or other admin accounts.

This means you can safely hand the panel to staff or contractors without exposing sensitive controls.

---

## 3. Logging In & Staying Secure

- Admins log in with their **own email and password** — each person has a separate account.
- Sessions automatically **time out after 30 minutes of inactivity** and require re-login, so an unattended screen can't be misused.
- **Every action is recorded** (see *Audit Logs* below) — who did what, and when.
- Admins **cannot accidentally lock themselves out**: the system stops you from deleting, suspending, or downgrading your *own* account.

---

## 4. The Dashboard, Section by Section

The panel's menu is organised into five groups: **Overview, User Management, Platform, Business & Revenue, and System.** Here is what each area does.

### 📊 Overview

**Dashboard** *(all admins)*
Your home screen. Shows the key health numbers of the platform at a glance:
- Total users, broken down by founders, experts, and investors.
- New sign-ups this week / this month.
- Users active today, and how many accounts are frozen.
- Total revenue and revenue this month.
- Number of events.
- Visual charts for user growth, revenue over time, and subscription tiers.
- A **date filter** (Last 7 days, 15 days, 1 month, or a custom range) so you can view trends for any period.

**Analytics & Reports** *(Primary Admin only)*
A deeper view of platform performance and trends for reporting and decision-making.

### 👥 User Management

**All Users** *(all admins)*
The master list of everyone on the platform. You can:
- **Search** by name or email.
- **Verify** a user (mark their account as genuine/trusted).
- **Freeze / unfreeze** an account — instantly blocks a problem user from using the platform (takes effect immediately, even if they're currently logged in).
- **Delete** an account (Primary Admin only).

**Flagged / Frozen** *(all admins)*
A focused list of accounts that have been frozen or flagged for attention, so problem cases are easy to find and review.

**Role Applications** *(all admins)*
When users apply to become a verified expert or investor, their requests appear here. You can **approve** or **reject** each one — and if you reject, the reason is automatically **emailed to the user**.

**Support Tickets** *(Primary Admin only)*
Messages and help requests submitted by users, collected in one place to respond to.

### 🚀 Platform

**Startup Management** *(all admins)*
Review startups submitted to the platform and **approve** or **reject** them.

**Investor Management** *(all admins to view; approvals as permitted)*
Review investor profiles and accreditation requests, and **approve** or **reject** them (rejection reasons are emailed to the investor).

**Content Moderation** *(all admins)*
Keep the community clean. View user posts and **remove** anything inappropriate.

**Events & Webinars** *(all admins)*
Create and manage events and webinars. When creating one you set a **title, type, start date/time,** and an optional **presentation link**.

**Uploaded Documents** *(all admins)*
A central library of files users have uploaded (e.g. pitch decks, supporting documents). You can **search** by file name, uploader, or context, **view/download** a file, or **delete** it.

**Notifications** *(all admins to send; templates Primary only)*
**Broadcast announcements** to users — for example a maintenance notice or a new feature. You choose the **target audience** and **alert type**, then write a **title and message**.

### 💳 Business & Revenue

**Payments & Finance** *(Primary Admin only)*
See all transactions on the platform and issue **refunds** when needed.

**AI Control (Ignisha)** *(Primary Admin only)*
Manage the platform's built-in AI assistant ("Ignisha"):
- Set how many **free AI messages** each user gets per day.
- Adjust the AI's **creativity level**.
- Manage the AI service connection (API key).

### ⚙️ System

**Platform Settings** *(Primary Admin only)*
The master switches for the whole platform:
- **Maintenance Mode** — temporarily takes the site offline for everyone (with a friendly message) while you make changes.
- **Allow Registration** — turn new sign-ups on or off.
- **Support Email** — the contact address shown to users.
- **Pricing** — set the **Pro** and **Elite** subscription prices and the **platform commission %**.
- **Payment & AI keys** — securely update the connections to the payment provider (Razorpay) and the AI provider.

**Admin Management** *(Primary Admin only)*
Create and manage your admin team:
- **Add a new admin** (name, email, password, and their level — Primary or Secondary).
- **Remove** an admin.

**Audit Logs** *(Primary Admin only)*
A permanent, tamper-evident record of **every action every admin takes** — who did it, what they changed, and when. You can filter by the type of action (for example, "SUSPEND"). This is essential for accountability and compliance.

**Login Activity** *(Primary Admin only)*
A history of admin and user logins, so you can spot unusual access.

---

## 5. Built-in Safety Features (Why You Can Trust It)

- **Two permission levels** — sensitive controls (money, settings, AI, other admins) are reserved for Primary Admins only.
- **Permanent audit trail** — nothing happens in the panel without being logged. If something is changed, you can always see who did it.
- **Automatic logout** — sessions expire after inactivity, protecting unattended screens.
- **Instant enforcement** — freezing a user takes effect right away, even mid-session.
- **Self-protection** — admins can't delete, suspend, or demote their own account, preventing accidental lock-outs.
- **Emails on key decisions** — users are automatically notified (with a reason) when an application is rejected, keeping communication transparent.

---

## 6. Glossary (Plain-English Terms)

| Term | What it means |
|---|---|
| **Admin Panel / Dashboard** | The private control room for running the platform. |
| **Primary Admin** | The highest level — full control, including money and other admins. |
| **Secondary Admin** | A limited admin for day-to-day operations only. |
| **Freeze an account** | Instantly block a user from using the platform (reversible). |
| **Verify a user** | Mark an account as genuine/trusted. |
| **Role Application** | A user's request to become a verified expert or investor. |
| **Content Moderation** | Reviewing and removing inappropriate posts. |
| **Broadcast / Notification** | A message sent out to users from the platform. |
| **Maintenance Mode** | Temporarily taking the site offline for everyone while you work on it. |
| **Audit Log** | The permanent record of every admin action. |
| **Refund** | Returning a payment to a customer. |
| **Subscription Tiers (Free / Pro / Elite)** | The platform's paid membership levels. |

---

## 7. Quick FAQ

**Q: Can I give a staff member access without giving away financial control?**
Yes — make them a **Secondary Admin**. They can manage members, content, and events but cannot see payments, change settings, or manage other admins.

**Q: If a staff member makes a mistake, can we tell who did it?**
Yes. Every action is recorded in the **Audit Logs** with the person's name, the change, and the time.

**Q: What happens if someone problematic joins?**
You can **freeze** their account instantly from *All Users*, which blocks them immediately, or **delete** it (Primary Admin).

**Q: Can we take the site down briefly for an update?**
Yes — turn on **Maintenance Mode** in *Platform Settings*. Visitors see a friendly "under maintenance" message until you switch it back on.

**Q: How are users told when their application is rejected?**
The system automatically **emails them the reason** you provide.

---

*This document describes the Admin Panel as currently built. If new features are added, this guide should be updated to match.*
