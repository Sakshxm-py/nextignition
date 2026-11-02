# Event Hosting Refinement Context

## Overview
This feature refines the event hosting capability for Elite users on Next Ignition. It introduces a secure escrow-based payment flow, mandatory KYC for hosts, and automated platform branding.

## Core Features
1.  **Escrow Payments**:
    - All ticket money for paid events is collected by the platform.
    - Payments are verified via Razorpay signatures and webhooks.
    - Users are only added to the registration list after a successful payment.
2.  **Host KYC**:
    - Elite users must be verified (`isVerified: true`) to host paid events.
    - Prevents fraudulent activity and ensures quality.
3.  **Platform Branding**:
    - Every event asset includes "Powered by Next Ignition".
    - Standardized across cards, detail pages, and virtual rooms.
4.  **Commission Logic**:
    - Default Platform Commission: **10%**.
    - Payouts to hosts are calculated as: `Total Revenue - Commission`.

## Technical Implementation
- **Tables**:
    - `events`: Stores event metadata (JSONB).
    - `event_registrations`: Tracks ticket purchases and statuses.
    - `host_payouts`: Tracks financial settlements.
- **Workflow**:
    - Registration -> Razorpay Checkout -> Verify Signature -> Add Attendee.
    - Post-Event -> Calculate Net Revenue -> Admin Approval -> Payout.

## Future Context
> [!TIP]
> When modifying the revenue logic, ensure the `PLATFORM_COMMISSION` constant in `backend/src/utils/payoutUtils.ts` is updated.
