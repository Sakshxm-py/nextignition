import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import "./styles/globals.css";

const g = globalThis as any;
if (typeof g.global === "undefined") {
  g.global = g;
}

/* Native status bar: overlay the web view so the app draws edge-to-edge under a
   transparent bar (removes the opaque "black strip" at the top). Style.Light =
   dark icons, which suit the light app theme. Dynamically imported + guarded so
   the web build never breaks if the plugin isn't present. */
if (Capacitor.isNativePlatform()) {
  (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#00000000" });
      }
    } catch (err) {
      console.warn("[StatusBar] setup skipped:", err);
    }
  })();
}

createRoot(document.getElementById("root")!).render(<App />);