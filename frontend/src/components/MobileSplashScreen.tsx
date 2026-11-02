import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import logoAnimation from '../assets/Logo_Animation_opt.gif';

let splashHasBeenShown = false;

export const MobileSplashScreen = ({ children }: { children?: React.ReactNode }) => {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform() && !splashHasBeenShown) {
      setShowSplash(true);
      splashHasBeenShown = true;

      // The optimized GIF runs ~5s. A GIF animates automatically as an image —
      // no autoplay permission, no <video> WKWebView quirks — and at ~2MB it
      // decodes instantly, so it plays through (the 42MB original was too large
      // to decode in time, which is why only the first frame showed).
      const timer = setTimeout(() => setShowSplash(false), 5500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center w-full h-full pointer-events-none" style={{ backgroundColor: '#ffffff' }}>
        <img
          src={logoAnimation}
          className="w-full h-full object-cover"
          alt="NextIgnition"
        />
      </div>
    );
  }

  return <>{children}</>;
};
