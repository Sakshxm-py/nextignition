# App Store — App Review Notes (paste into App Store Connect → App Review Information)

App: NextIgnition
Bundle ID: com.nextignition.gigzsapp
Version / Build: 1.2 (11)

---

## Demo / review account credentials

NextIgnition has three user roles with different navigation and features. Please
test with the accounts below (or self-register — sign-up via email, Apple, or
Google lands directly on the dashboard, no email code required).

> ACTION REQUIRED (you, the developer): create one working account per role on the
> production backend and fill these in before submitting.

| Role     | Email                      | Password        |
|----------|----------------------------|-----------------|
| Founder  | review-founder@example.com | <set-password>  |
| Expert   | review-expert@example.com  | <set-password>  |
| Investor | review-investor@example.com| <set-password>  |

Notes:
- Please do NOT use the in-app Admin area; it is for internal staff only.
- "Continue with Apple" and "Continue with Google" both work on device.

---

## Business model — Guideline 3.1.1 (In-App Purchase)

NextIgnition is a **completely free app on iOS**. There are no in-app purchases,
no subscriptions, and no external purchase links anywhere in the iOS app. Every
feature is fully unlocked for all users on iOS. There is no paid digital content
gated behind any out-of-app purchase. (Subscriptions exist only on our web/Android
platforms and are not referenced, advertised, or accessible from the iOS app.)

---

## User-Generated Content moderation — Guideline 1.2

NextIgnition is a professional networking app with user-generated content (a social
feed, direct messages, community chat, podcasts, events, and profiles). We have
implemented all required safety mechanisms:

1. **Report content** — every UGC surface has a Report action that files a
   moderation report to our admin queue:
   - Feed posts: post "⋯" menu → Report post
   - Direct messages: conversation menu → Report
   - Community chat: message menu → Report
   - Podcasts: episode → Report
   - Events: event detail → Report event (top-right flag)
   - Profiles: profile menu → Report Profile
2. **Block abusive users** — Block from the DM conversation menu and from a user's
   profile. Blocks are enforced server-side and are mutual: a blocked user can no
   longer message you, appear in your feed, or post to you in shared communities.
3. **Content filtering** — submitted messages, posts, comments, and community
   messages are screened by a profanity/abuse filter and rejected at creation.
4. **EULA / zero tolerance** — users must accept our Terms at sign-up. The Terms
   include an explicit zero-tolerance policy for objectionable content and abusive
   behavior, and a commitment to review reports and act (content removal / account
   termination) within 24 hours.

---

## Sign in with Apple — Guideline 4.8 / 5.1.1

Sign in with Apple is offered alongside Google sign-in on both the login and
sign-up screens. A successful Apple sign-in lands the user on their role dashboard.

---

## Account deletion — Guideline 5.1.1(v)

Users can permanently delete their account from within the app:
Settings → Account & Security → Delete Account (also under Settings → Privacy &
Data, and a dedicated Delete Account page). This is a hard delete, not a
deactivation.

---

## Privacy — Guideline 5.1.1 / 5.1.2

- The app does not track users across apps or websites and does not use the IDFA;
  no App Tracking Transparency prompt is required.
- A PrivacyInfo.xcprivacy manifest is included.
- Camera/microphone/photo-library permissions are used for profile photos, pitch
  media, and in-app audio/video calls, each with a clear purpose string.

Thank you for reviewing NextIgnition.
