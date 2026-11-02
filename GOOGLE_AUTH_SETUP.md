# Google Sign-In — Configuration & Reference (NextIgnition)

The "Google Sign-In works sometimes" problem on Android is **not random**. Google issues
an ID token only when the running app's **signing-certificate SHA-1 + package name**
matches a registered Android OAuth client. Different build/install paths use different
signing keys, so sign-in succeeds or fails purely based on *how that APK was built/installed*.

## Identity values

| Thing | Value |
|---|---|
| Cloud project | `auramed-470305` (project number `236345953761`) |
| Android package name | `com.nextignition.app` (`build.gradle` `applicationId`) |
| **serverClientId** (Web client — used by native plugin & web) | `236345953761-fiqum6k0vbauebhiinr4dvci0c37jd4o.apps.googleusercontent.com` |
| Android OAuth client 1 | `236345953761-7lsj2uk5720lo59bid4f8ph9kthpftvf` |
| Android OAuth client 2 | `236345953761-cgh9l2pmlc2ph7qcjcnp596c12km5cl6` |
| iOS OAuth client (reversed in Info.plist) | `236345953761-9m1hrq23udi96mmiv75b3fqt7uft0j6k` |

> `serverClientId` MUST stay the **Web** client. Native Google Sign-In returns an ID token
> whose `aud` is the Web client, which is what the backend verifies. Do not change it to an
> Android client ID. It is set in `frontend/capacitor.config.json` and
> `frontend/android/app/src/main/res/values/strings.xml`.

## Signing keys and where each comes from

| Key | SHA-1 | Used by | Registered as Android OAuth client? |
|---|---|---|---|
| Play **App signing** key | `C5:A9:C1:7F:7C:B0:40:51:4F:E9:0C:DF:EB:E2:65:8F:08:77:C1:B3` | every Play-delivered install (Google re-signs) | ✅ client 2 (`cgh9l2…`) |
| A **debug** keystore | `79:B5:36:89:9C:CB:14:AE:41:CB:E8:59:79:E3:26:47:5B:12:03:D6` | one dev machine's `~/.android/debug.keystore` | ✅ client 1 (`7lsj2uk…`) |
| Play **upload** key | `00:A7:2A:FD:EF:C4:FA:C7:28:CE:86:54:AA:12:15:A9:CF:21:D7:96` | the AAB you upload; Internal App Sharing installs | ❌ **register this** |
| Other devs' debug keystores | unique per machine | local `gradlew assembleDebug` | ❌ register per machine, or use a shared debug keystore |

## Which install paths work today

| Install path | Effective SHA-1 | Sign-in |
|---|---|---|
| **Play Store production / internal / closed / open testing** | `C5:A9…` (app-signing) | ✅ works |
| Internal App Sharing (quick-share link) | `00:A7:2A…` (upload) | ❌ until upload key registered |
| Debug build on the `79:B5:36…` machine | `79:B5:36…` | ✅ works |
| Debug build on any other machine / CI | unique | ❌ register that SHA |
| Locally-built release APK (currently debug-signed) | that machine's debug key | ❌ usually |

## Action items

1. **Register the upload key** so Internal App Sharing + direct testing of the uploaded
   artifact work. Console → APIs & Services → Credentials → Create OAuth client ID →
   Android → package `com.nextignition.app`, SHA-1 `00:A7:2A:FD:EF:C4:FA:C7:28:CE:86:54:AA:12:15:A9:CF:21:D7:96`.
   (Propagation: 5 min – a few hours.)
2. **Verify backend env on Render:** `GOOGLE_CLIENT_ID` must equal the Web client
   `236345953761-fiqum6k0vbauebhiinr4dvci0c37jd4o.apps.googleusercontent.com`.
   If it's anything else, *all* Google logins fail.
3. **(Optional) Stop release builds being debug-signed.** `frontend/android/app/build.gradle`
   line ~23 sets `release { signingConfig signingConfigs.debug }`. The Android Studio
   "Generate Signed Bundle" wizard overrides this (uses the upload key), so Play uploads are
   fine — but a CLI/CI `bundleRelease` would produce a debug-signed AAB. Wire a real release
   `signingConfig` (reading from an ignored `keystore.properties`) before moving to CI.
4. **(Optional) Shared debug keystore** committed to the repo so every dev/CI machine produces
   the same debug SHA-1 — then only one debug SHA needs registering, instead of per-machine.

## Before every Play upload (so the JS fixes ship)

```bash
cd frontend
npm run build
npx cap sync android
# bump versionCode in android/app/build.gradle, then build the signed AAB in Android Studio
```
The native app embeds a built copy of the web bundle; without `npm run build` + `cap sync`,
the AAB ships stale frontend code.

## Apple Sign-In note (separate landmine)

The Apple `clientId` (`frontend/src/services/authService.ts`), the server `APPLE_CLIENT_ID`,
and the controller fallback (`backend/.../authController.ts`) must all equal the real iOS
bundle id. They currently disagree (`com.nextignition.gigzsapp` vs `com.nextignition.app`).
Align all three before relying on Apple login.
