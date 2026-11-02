# NextIgnition - Frontend Fixes Context Document

This document summarizes the recent critical fixes applied to the frontend codebase, addressing Android Google Sign-In failures, build pipeline errors, and TypeScript compilation issues.

## 1. Android Google Sign-In Fixes (ANR & Crash Resolution)
**Issue:** The app was experiencing "App Not Responding" (ANR) crashes and hanging on a blue spinner when users attempted to log in or log out using Google on Android devices. Additionally, an instant `12501` error would sometimes cause a crash.

**Resolution:**
- **Explicit Initialization:** Updated `authService.ts` to strictly call `await GoogleAuth.initialize(...)` with the `serverClientId` *before* invoking `GoogleAuth.signIn()` on native platforms. This prevents the native Capacitor bridge from hanging.
- **Graceful Error Handling:** Wrapped the native sign-in calls in `LoginPage.tsx` and `SignupPage.tsx` to explicitly catch and ignore the `12501` error (which translates to the user canceling or closing the native prompt). This clears the loading spinner gracefully instead of hanging.
- **Safe Sign-out:** Wrapped the `GoogleAuth.signOut()` call with a `googleSignedIn` local storage flag to ensure it's only triggered if the user actually authenticated via Google natively, avoiding a crash on generic logouts.

### Google Cloud Console Configuration Note (For the Team)
The Android build is hardcoded to use the package name **`com.nextignition.app`** (set in `android/app/build.gradle`), despite iOS and the base Capacitor config using `gigzsapp`. 
**Action Required for Android Devs:** If anyone encounters a `12501` error on their local machine/emulator, it means their local `debug.keystore` SHA-1 fingerprint is not registered in the Google Cloud Console under the `com.nextignition.app` OAuth client. They must run `.\gradlew signingReport` in the `android` folder and add their specific SHA-1 to the Console.

## 2. Build Pipeline & Dependency Stability
**Issue:** The production build (`npm run build`) was failing due to Node.js version mismatches (`ERR_REQUIRE_ESM`) and broken type exports from third-party libraries.

**Resolution:**
- **Vite Downgrade:** Reverted Vite from `v7` to `v6.3.5` (along with compatible `plugin-react-swc` and `vite-plugin-pwa`). Vite 7 strictly requires Node 22.12+, but the environment is running Node 22.11.0. Vite 6 provides universal compatibility across Node 18, 20, and 22.x without requiring the team to wrestle with node version managers.
- **React Hook Form Stability:** Downgraded `react-hook-form` to the last known stable version (`v7.54.2`). The newer v7.71.1 shipped with broken/missing `.d.ts` declaration exports which broke standard imports like `FormProvider`.

## 3. UI/Animation Exports & TypeScript Strictness
**Issue:** A massive overhaul of Framer Motion (v12) broke 87+ components by moving exports out of `motion/react` and removing necessary declaration files. Furthermore, `npm run typecheck` was failing across the board.

**Resolution:**
- **Framer Motion Rollback:** Bulk-updated 87+ component files to change imports from `motion/react` to `framer-motion`. Downgraded the `framer-motion` package to `v11.18.2` which contains stable type definitions and the required `AnimatePresence` exports.
- **Global Types:** Created `src/types/html2canvas.d.ts` to satisfy the TypeScript compiler for the missing `@types/html2canvas` module.
- **Strict Typing:** Fixed implicit `any` parameter errors in `chart.tsx` (by asserting Recharts' payload as `any[]`) and in `InvestorAnalytics.tsx` (by typing `clonedDoc: Document`).

**Status:** `npm run typecheck` and `npm run build` now complete with **0 errors**. The codebase is production-ready and cross-compatible across team members' environments.
