# NextIgnition — Work Report (2026-06-07)

Branch: `fix/admin-panel-bugs-and-google-auth`

This report has two parts:
- **Part A — Changes made today** (completed, both backend & frontend typecheck clean)
- **Part B — New UI bugs found** (a fresh audit of founder / investor / shared surfaces; **not yet fixed**)

---

## PART A — Changes made today

### 1. Security: admin-auth follow-up (from the 2026-06 audit)
Investor-verification admin endpoints were authorizing via the **user JWT** (`req.user.role === 'admin'`) instead of the admin RBAC stack.
- `backend/src/routes/verificationRoutes.ts` — `/admin/pending`, `/admin/approve/:queueId`, `/admin/reject/:queueId` re-mounted under `protectAdmin → validateAdminSession → enforceAdminPermission(INVESTOR_MGMT, VIEW/APPROVE)`, registered **before** the global user `protect` chain.
- `backend/src/controllers/verificationController.ts` — those handlers now use `req.admin` (not `req.user`), write to the audit trail via `req.logAdminAction`, and dropped the inline role checks.

### 2. Profile pictures not loading (root cause + fix)
**Cause:** all avatars / cover photos / event images upload to the Supabase **`profile-pics`** bucket and resolve via `…/storage/v1/object/public/profile-pics/…`, but only the `uploads` bucket was ever provisioned public — so every avatar URL returned HTTP 400.
- `backend/migrations/011_make_profile_pics_bucket_public.sql` — idempotently creates `profile-pics` as **public** + public-read policy.
- `backend/supabase_schema.sql` — same block added for fresh setups.
- `frontend/index.html` — added `<meta name="referrer" content="no-referrer">` so cross-origin Google (`lh3.googleusercontent.com`) avatars stop being blocked. (Safe: auth uses Origin+JWT; API uses Origin-based CORS; nothing reads the incoming Referer.)
- **⚠ Action required:** migration 011 must be applied to Supabase (dashboard toggle, SQL editor, or `node scratch/run_sql_migration.js migrations/011_make_profile_pics_bucket_public.sql`).

### 3. Ignisha AI — self-diagnosing demo message
The endpoints all exist and the controller is a real OpenRouter implementation; "Demo response" fires when the provider call fails at runtime.
- `backend/src/controllers/aiController.ts` — added failure-reason tracking (`auth` / `rate_limited` / `model_unavailable` / `network` / `empty` / `no_key`). Demo/fallback responses in chat & quick-action now name the actual cause + next step instead of the generic "keys missing".
- Key present (`OPENROUTER_API_KEY`) but model is `meta-llama/llama-3.3-70b-instruct:free`; the most likely live cause is free-tier rate-limit / model-gating. Recommended fix: small paid model + credits, and add a `GEMINI_API_KEY` fallback.

### 4. Expert role — frontend bug fixes
- `frontend/src/utils/formatters.ts` — new `parseLocalDate` / `formatLocalDate` / `todayLocalISO` (timezone-safe date-only handling).
- `SchedulePage.tsx` — timezone-safe dates everywhere; today's sessions no longer dropped; "Available Hours" now sums real hours; founder optional chaining; local `min` date; **Join Call wired** to the meeting link; "₹500/hr" → expert's real rate.
- `EarningsPage.tsx` — dynamic Tailwind colors → static map (filter highlights render); loading + error + empty states; guarded API parse; date-range filter now applied; growth-% fixed; CSV escaping; amount formatting; **Week/Month/Year toggle wired** to backend breakdowns.
- `DiscoverExperts.tsx` — filter sidebar now actually filters (expertise/experience/rating/price/availability); price inputs bound; `experience` coerced to number; pagination resets; **removed fabricated** ProfileViewModal data.
- `BookingModal.tsx` — total uses the expert's real rate (not hardcoded ₹500); weekday timezone fix; stale slots cleared on date change.
- `ExpertDashboard.tsx` — "Pending Bookings" bound to real requests; removed fake "3" message badge + made notification/stats dots conditional; safe growth %; removed hardcoded "12 Successes"; stable list keys; **Join wired**; removed dead founder ProfileCreationCard; **View Profile wired**; de-faked "top 5%" badge; removed permanently-hidden fake session toast.
- `ContentStudioPage.tsx` — save buttons disabled while saving; `formatDistanceToNow` crash guarded.
- `ScheduleMeetingModal.tsx` — form resets on open; popup-blocked/error feedback; **stopped fabricating a fake guest email** for calendar invites.
- `settings/ExpertProfileSettingsTab.tsx` — save failures now show red (were styled as success) and auto-clear.
- `MyClientsPage.tsx` — real client status derived from `/bookings`; real `sessionsCompleted`/`nextSession`; passes real `email` to the invite modal; filter-aware count.
- `ProfileViewModal.tsx` — `location` now optional; Contact section hidden when empty.

### 5. Backend data
- `backend/src/controllers/earningsController.ts` — returns `breakdowns: { week, month, year }` so the earnings chart period toggle works.

---

## PART B — New UI bugs found (NOT yet fixed)

Fresh audit of the **founder**, **investor**, and **shared** surfaces (the expert role was already fixed above). Grouped by severity. `file:line` references.

### 🔴 HIGH — fabricated data shown as real, or core actions broken

**Investor**
- `DiscoverStartups.tsx` — entire component is a "Coming Soon" placeholder; all fetch/filter/save logic is dead, yet the InvestorDashboard "Explore Startups" tab renders it and it still fires discarded `/startups` + `/bookmarks` calls on mount. (`:115-163`)
- `DealFlowPipeline.tsx:731-759` — quick actions (notes/meeting/AI/deal-room/share) collect input via `prompt()` then discard it; a fake 2s timer shows "completed" though nothing persists.
- `DealFlowPipeline.tsx:543,884` — pipeline **search box does nothing** (state never filters the columns/table).
- `FundingPortalInvestor.tsx:73-242,560` — all filters, sort, and sidebar search are **decorative** (never applied); "N startups match" always shows the total.
- `InvestorAnalytics.tsx:1027-1138` — Engagement Metrics section is **hardcoded fake** (92%, 4.2h, message counts, 14-bar chart); contradicts the "No data yet" line beneath it.
- `InvestorAnalytics.tsx:967-1023` — radar chart is a static hardcoded polygon.
- `InvestorAnalytics.tsx:1246-1299` — "Saved Searches" list is permanently empty and Create only `alert()`s "Saved!" without adding anything.

**Founder**
- `FundingPortalFounder.tsx:1021-1108` — AI pitch-deck analysis ("Strengths/Areas/Missing Slides") is **static fake** content; `:480` drives it with a fixed 2s timer.
- `FundingPortalFounder.tsx:1542,1780` — selected paid **visibility plan (₹2,999 / ₹4,999) is never submitted** — silently dropped.

**Shared**
- `MessagingPage.tsx:723` — **no socket listener** at all → incoming messages from the other party never appear until a manual refetch.
- `DirectMessaging.tsx:118,385,781` — `id`/`_id` and `sender` shape mismatches: socket dedup never matches (dupes), and `isMe` can align every bubble to the wrong side.
- `CommunitiesPage.tsx:718-769` — no socket listener for incoming community chat messages (only voice signaling).
- `CommunitiesPage.tsx` — `dc-*` theme classes used heavily (`text-dc-text-header`, `dc-bg-chat`, …) are **not generated by the build** → widespread missing colors/backgrounds. (Known issue per project memory.)
- `ProfilePage.tsx:207-260` — `cacheBust` appends `?v=Date.now()` to avatar/cover/video **every render** → re-downloads + flicker, caching broken.
- `ProfilePage.tsx:223-242` & many modals (`:300-338,1248-1437,1522-1601,1603-1706`) — profile stats are hardcoded zeros; Quick Post / Add Milestone / Availability / Create Offer modals are **non-functional** (uncontrolled inputs, local-only state lost on reload, dead submit buttons).
- `DiscoverCoFounders.tsx:137,659` — Match Score is a **fabricated** name-hash presented as "AI analysis"; "Load More" button is dead.
- `EventsPage.tsx:1083-1103` — events with short titles ('test', 'abc', '-', …) are **replaced with fake marketing copy**; `:2076-2100` appends boilerplate agenda/description to every event; `:2264` shows fake attendee avatars.
- `EventsPage.tsx:218` — event `id` derived from `parseInt(_id.slice(-6),16)` → collisions / `NaN`→1 → duplicate React keys + wrong card updates after register/bookmark.

### 🟡 MEDIUM — misleading data, dead controls, correctness

**Investor**
- `InvestorDashboard.tsx:443` — layout reads `window.innerWidth` in render with no resize listener → broken margins on resize.
- `InvestorDashboard.tsx:641` — "Contact Support" → non-existent tab (blank screen). `:877` — startup-profile Back always returns to Pipeline regardless of origin.
- `InvestorDashboard.tsx:957-992` — Portfolio Value/ROI rely on a `valuationMultiple` the data lacks → ROI always 0%.
- `DealFlowPipeline.tsx` — dead Filters button (`:1029`), dead row view/kebab buttons (`:1130`), fake pagination (`:1155`), uncontrolled Settings panel that toasts "saved" (`:1326-1435`), stage `<select>` missing the `closed` option (`:1105`).
- `FundingPortalInvestor.tsx` — non-functional range sliders (`:438,466`), `teamSize` always blank → " members" (`:629`), dead "Save Search" (`:482`) and "Load More" (`:676`).
- `InvestorAnalytics.tsx` — Conversion Rates all-zero (`:711`), "Refresh insights" does `window.location.reload()` (`:818`), AI-insight nav targets a non-existent `[data-nav="messages"]` (`:885`), always-`+0%` KPI trend (`:519`), Industry Trends tab renders empty (`:1185`).
- `SavedStartupsList.tsx:149` — row chevron (open startup) is dead.

**Founder**
- `FundingPortalFounder.tsx` — Final-Review shows fake green checks for deck/video regardless of upload (`:1493`); progress % tracks clicks not uploads (`:564`); submit not gated on uploads (`:1727`); saved-video playback has no `src` set (`:1228`); doc remove (X) button dead (`:1453`); crash risk on `.analysis.strengths`/`.gaps` (`:1372`).
- `FounderDashboard.tsx:244` — role switch only sets local state (doesn't change dashboard/data).
- `MyStartupPage.tsx:402` — "Create My Profile" uses hash routing the dashboard doesn't handle (dead CTA); `StartupJourneyHub.tsx:193` — "Connect" buttons navigate to unrecognized tabs → "coming soon".

**Shared**
- `MessagingPage.tsx:1357` — emoji search filter is a no-op; `:350` conversation dedup parses locale-string dates (unreliable).
- `NotificationsDropdown.tsx:346` — "View All Notifications" dead; `:139` user-scoping guard uses `id` not `_id` (may skip the security filter); relative times frozen (`:332`).
- `CommunitiesPage.tsx:1192` — `members.sort()` mutates state in place; `:1992/2018` render avatar URL as giant text instead of `<img>`; `:1810` avatar base falls back to `localhost:5000` in prod; `:705` `.name` accessed without optional chaining (sort crash).
- `EventsPage.tsx` — calendar groups by UTC date → off-by-one (`:683`); edit pre-fill mis-detects in-person vs virtual from synthesized meetingLink (`:572`); Agenda/Prerequisites/Settings/Language inputs uncontrolled & dropped (`:1490-1546`); fake resource downloads (`:1702`); validation error renders behind the modal (`:594`).
- `DiscoverCoFounders.tsx:341` — "Recently Active" sorts by `previousStartups` (not recency); `:507` startup-status badge collapses 3 states into 2; `:191` duplicate fetch on mount.
- `SettingsPage.tsx:45` — persisted `activeTab` from another role → blank settings panel (no fallback).
- `ProfilePage.tsx:479` — star fill (`currentProfile.rating`) disagrees with numeric label (`stats.avgRating` = 0); dead Share/Report/Block/Enhance-with-AI/Sync-Calendar buttons (`:599,611,1208,1416`).

### 🟢 LOW — polish / a11y / dead code
- `InvestorDashboard.tsx:1199` (`{0 > 0 && …}` dead badge), `:482/529` always-on bell dot, `:1024` `Math.random()` React key.
- `CommunitiesPage.tsx` — `Math.random()` waveform in render (`:1742`), index keys for participants/reactions, `window.location.hash` in a `useEffect` dep array (`:950`).
- `DiscoverInvestors.tsx:210` — single-role investors never show their role chip (`> 1` should be `>= 1`).
- Various missing `alt`/labels, `<video>` without captions, frozen relative timestamps, and `alert()`-based flows throughout.

### Cross-cutting themes
1. **`id` vs `_id` / object-vs-string** mismatches in messaging & notifications (highest correctness risk).
2. **No real-time socket listeners** for incoming messages in MessagingPage & CommunitiesPage.
3. **Fabricated/mock data presented as live** across analytics, profile, events, co-founder matching, pitch-deck AI.
4. **Dead buttons / decorative filters** across investor & founder portals.
5. **Timezone off-by-one** from `new Date("YYYY-MM-DD")` and UTC date grouping.
6. **`dc-*` Tailwind classes** unbuilt in CommunitiesPage.

---

*Generated 2026-06-07. Part A is implemented and typechecks clean; Part B is a prioritized backlog awaiting go-ahead.*
