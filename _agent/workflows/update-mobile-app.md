---
description: how to sync web changes to the mobile app
---

Whenever you make changes to your codebase (web/repo), they are NOT automatically reflected in the Android/iOS app. You must follow these 3 steps to sync them:

### 1. Build the Web App
This generates the latest static files in your `build/` (or `dist/`) directory.
```bash
cd frontend
npm run build
```

### 2. Sync Capacitor
This copies those static files into the native Android/iOS project folders.
// turbo
```bash
npx cap sync
```

### 3. Run the App
Open Android Studio and click the **Run** (▶️) button, or use the command line:
```bash
npx cap run android
```

---

### Troubleshooting: "Changes are not reflecting"
- **Check the `webDir`**: Ensure `capacitor.config.json` points to the correct build folder (e.g., `"webDir": "build"`).
- **Restart the App**: Sometimes the app needs a fresh install/restart in the emulator to pick up asset changes.
- **Clear Cache**: If issues persist, run `npx cap sync android` followed by a "Clean Project" in Android Studio.

### Troubleshooting: "App is not working (Connectivity)"
- **Localhost Alert**: Remember that the app cannot use `localhost` for API calls. Use your computer's IP (e.g., `192.168.x.x`).
- **CORS**: Ensure your backend `socket.ts` or CORS config allows `capacitor://localhost`.
- **AndroidManifest**: Ensure `android:usesCleartextTraffic="true"` is set in `AndroidManifest.xml` if using HTTP.
