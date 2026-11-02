import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import logoImage from '../assets/logo.png';
import { brandColors } from '../utils/colors';
import { Capacitor } from '@capacitor/core';
import { googleLogin, login, initGoogleSignIn, nativeGoogleSignIn, appleLogin, nativeAppleSignIn, completeAuthRedirect } from '../services/authService';

const GOOGLE_CLIENT_ID = Capacitor.isNativePlatform()
  ? (import.meta as any).env.VITE_GOOGLE_ANDROID_CLIENT_ID
  : (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

/* ── Google SVG icon ─────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.03 24.03 0 0 0 0 21.56l7.98-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

/* ── Apple SVG icon ──────────────────────────────────────── */
const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  /* ── Google credential callback ───────────────────────── */
  const handleGoogleCredential = useCallback(async (response: { credential: string }) => {
    try {
      setGoogleLoading(true);
      setError('');
      const data = await googleLogin({ credential: response.credential });
      completeAuthRedirect(data.role);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  /* ── Load & initialise Google Identity Services ───────── */
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const tryInit = () => {
      const initialized = initGoogleSignIn(GOOGLE_CLIENT_ID, handleGoogleCredential);
      if (initialized) {
        const g = (window as any).google;
        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer && g?.accounts?.id?.renderButton) {
          try {
            g.accounts.id.renderButton(btnContainer, { 
              theme: 'outline', 
              size: 'large',
              shape: 'rectangular',
              text: 'continue_with'
            });
          } catch (e) {
            console.error('Error rendering Google button:', e);
          }
        }
        return true;
      }
      return false;
    };

    // Try immediately (script may already be loaded from index.html)
    if (tryInit()) return;

    // Poll until ready (max 10 s)
    const start = Date.now();
    const timer = setInterval(() => {
      if (tryInit() || Date.now() - start > 10000) clearInterval(timer);
    }, 300);

    return () => clearInterval(timer);
  }, [handleGoogleCredential]);

  /* ── Email / password login ───────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      completeAuthRedirect(data.role);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unknown Error';
      if (err.message === 'Network Error') {
        setError('Cannot connect to the server. Is the backend running?');
      } else {
        setError(`Login failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-20 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: brandColors.electricBlue }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-72 h-72 rounded-full opacity-8"
          style={{ backgroundColor: brandColors.atomicOrange }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.12, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 pt-[env(safe-area-inset-top)]"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-4">
          <img
            src={logoImage}
            alt="Next Ignition Logo"
            className="h-6 lg:h-8 cursor-pointer"
            onClick={() => (window.location.hash = '#')}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 pr-1 hidden sm:inline">Don't have an account?</span>
            <a
              href="#signup"
              className="px-5 py-2 text-sm font-medium rounded-full text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: brandColors.atomicOrange }}
            >
              Sign Up
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left branding */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="hidden lg:block"
          >
            <h2 className="text-5xl font-bold mb-4 leading-tight">Welcome Back!</h2>
            <p className="text-gray-600 text-lg mb-8">Continue your journey from idea to launch.</p>
            <div className="space-y-4 text-gray-500 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColors.electricBlue}15` }}>
                  <span style={{ color: brandColors.electricBlue }}>✓</span>
                </div>
                <span>Access your personalized dashboard</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColors.atomicOrange}15` }}>
                  <span style={{ color: brandColors.atomicOrange }}>✓</span>
                </div>
                <span>Connect with founders, experts & investors</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${brandColors.navyBlue}15` }}>
                  <span style={{ color: brandColors.navyBlue }}>✓</span>
                </div>
                <span>Track your startup growth</span>
              </div>
            </div>
          </motion.div>

          {/* Login card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10 border border-gray-100">
              <h1 className="text-3xl font-bold mb-2">Log In</h1>
              <p className="text-gray-600 mb-8">Access your NextIgnition account</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              {/* ── Google Sign-In Button ──────────────────── */}
              {/* Hidden on iOS: Google blocks its OAuth/GSI flow inside embedded
                  WebViews (anti-phishing policy), so it can't initialize in the
                  Capacitor WebView. iOS users sign in with Apple or email/password. */}
              {GOOGLE_CLIENT_ID && Capacitor.getPlatform() !== 'ios' && (
                <>
                  {Capacitor.isNativePlatform() ? (
                    <button
                      type="button"
                      onClick={async () => {
                        console.log('[NativeAuth] Button clicked');
                        setGoogleLoading(true);
                        setError('');
                        try {
                          const result = await nativeGoogleSignIn();
                          await handleGoogleCredential({ credential: result.credential });
                        } catch (err: any) {
                          console.error('[NativeAuth] Detailed Error:', err);
                          const msg = err.response?.data?.message || err.message || 'Google Sign-In failed';
                          // Ignore user cancellation errors (12501 on Android)
                          if (!msg.includes('12501') && !msg.toLowerCase().includes('cancel')) {
                            setError(`Google Error: ${msg}`);
                          }
                          setGoogleLoading(false);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-md font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all mb-6 relative overflow-hidden"
                      style={{ minHeight: '48px', borderRadius: '12px' }}
                      disabled={googleLoading}
                    >
                      {googleLoading ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                      ) : (
                        <>
                          <GoogleIcon />
                          <span>Continue with Google</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="w-full mb-6 relative" style={{ minHeight: '48px' }}>
                      <div
                        id="google-signin-button"
                        className="w-full flex justify-center absolute inset-0"
                      />
                      {/* The official Google button will render inside the div above. We keep the spinner completely separate to prevent React from wiping the Google iframe when state changes. */}
                      {googleLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-md">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="my-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </>
              )}

              {/* ── Apple Sign-In Button — iOS only ────────── */}
              {Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' && (
                <button
                  type="button"
                  onClick={async () => {
                    setAppleLoading(true); setError('');
                    try {
                      const result = await nativeAppleSignIn();
                      const data = await appleLogin({
                        identityToken: result.identityToken,
                        authorizationCode: result.authorizationCode,
                        givenName: result.givenName,
                        familyName: result.familyName,
                      });
                      completeAuthRedirect(data.role);
                    } catch (err: any) {
                      // User cancelled the native Apple sheet — abort silently, not an error.
                      const msg = String(err?.message || err?.error || '');
                      if (err?.code === '1001' || /cancel/i.test(msg)) { setAppleLoading(false); return; }
                      // Surface the real reason (e.g. backend token rejection) instead of masking it.
                      setError(err?.response?.data?.message || msg || 'Apple Sign-In failed. Please try again.');
                    } finally { setAppleLoading(false); }
                  }}
                  disabled={appleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all mb-6"
                  style={{ minHeight: '48px' }}
                >
                  {appleLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" /> : <><AppleIcon /><span>Continue with Apple</span></>}
                </button>
              )}

              {/* ── Email / Password Form ──────────────────── */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <div className="flex items-center w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <Mail className="w-5 h-5 text-gray-400 mr-3 shrink-0 pointer-events-none" />
                    <input
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="block w-full p-0 border-0 bg-transparent focus:outline-none focus:ring-0 text-base"
                      required
                      autoComplete="email"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="flex items-center w-full px-4 py-3.5 rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <Lock className="w-5 h-5 text-gray-400 mr-3 shrink-0 pointer-events-none" />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full p-0 border-0 bg-transparent focus:outline-none focus:ring-0 text-base"
                      required
                      autoComplete="current-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600 focus:outline-none flex items-center justify-center ml-2 shrink-0"
                      style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        minHeight: 'unset',
                        padding: 0,
                        margin: 0,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={!loading ? { scale: 1.02 } : {}}
                  whileTap={!loading ? { scale: 0.98 } : {}}
                  className="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})` }}
                >
                  {loading ? 'Logging in…' : 'Log In'}
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </motion.button>
              </form>

              {/* Sign up link */}
              <p className="text-center mt-6 text-sm text-gray-600">
                Don't have an account?{' '}
                <a
                  href="#signup"
                  className="font-semibold hover:underline underline-offset-4"
                  style={{ color: brandColors.atomicOrange }}
                >
                  Sign up
                </a>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
