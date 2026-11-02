import { HeroSection } from './components/HeroSection';
import { FeaturesSection } from './components/FeaturesSection';
import { JourneySection } from './components/JourneySection';
import { RolesSection } from './components/RolesSection';
import { AIToolsSection } from './components/AIToolsSection';
import { CommunitySection } from './components/CommunitySection';
import { EventsSection } from './components/EventsSection';
import { GrowthTrackingSection } from './components/GrowthTrackingSection';
import { SecuritySection } from './components/SecuritySection';
import { SuccessStoriesSection } from './components/SuccessStoriesSection';
import { WhyChooseSection } from './components/WhyChooseSection';
import { MissionSection } from './components/MissionSection';
import { PricingSection } from './components/PricingSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { MobileSplashScreen } from './components/MobileSplashScreen';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { Component, Suspense, lazy, useEffect, useState, useRef, type ReactNode } from 'react';
import { getCurrentUser, logout, validateSession, getSessionExpiryReason, markActivity } from './services/authService';
import { refreshPremium, startPremiumListener, clearPremiumFlag, logoutPurchases } from './services/purchases';
import { getSocket } from './services/socketService';
import { usePushNotifications } from './hooks/usePushNotifications';
import { Toaster, toast } from 'sonner';
import { LogOut, X } from 'lucide-react';
import { getSingletonApiBase } from './utils/apiResolution';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const LoginPage = lazy(() => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./components/SignupPage').then((m) => ({ default: m.SignupPage })));
const DetailedSignupPage = lazy(() => import('./components/DetailedSignupPage').then((m) => ({ default: m.DetailedSignupPage })));
const ProfileCompletionPage = lazy(() => import('./components/ProfileCompletionPage').then((m) => ({ default: m.ProfileCompletionPage })));
const TermsPage = lazy(() => import('./components/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const CookiePolicyPage = lazy(() => import('./components/CookiePolicyPage').then((m) => ({ default: m.CookiePolicyPage })));
const ContactPage = lazy(() => import('./components/ContactPage').then((m) => ({ default: m.ContactPage })));
const DeleteAccountPage = lazy(() => import('./components/DeleteAccountPage').then((m) => ({ default: m.DeleteAccountPage })));
const PublicRegistrationPage = lazy(() => import('./components/PublicRegistrationPage').then((m) => ({ default: m.PublicRegistrationPage })));
const EventSurveyPage = lazy(() => import('./components/EventSurveyPage').then((m) => ({ default: m.EventSurveyPage })));

const FounderDashboard = lazy(() => import('./components/FounderDashboard').then((m) => ({ default: m.FounderDashboard })));
const ExpertDashboard = lazy(() => import('./components/ExpertDashboard').then((m) => ({ default: m.ExpertDashboard })));
const InvestorDashboard = lazy(() => import('./components/InvestorDashboard').then((m) => ({ default: m.InvestorDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminPanel = lazy(() => import('./components/AdminPanel'));

const MyStartupEditorPage = lazy(() => import('./components/MyStartupEditorPage').then((m) => ({ default: m.MyStartupEditorPage })));
const StartupPublicPage = lazy(() => import('./components/StartupPublicPage').then((m) => ({ default: m.StartupPublicPage })));
const SharedPostPage = lazy(() => import('./components/SharedPostPage').then((m) => ({ default: m.SharedPostPage })));

const ProfilePage = lazy(() => import('./components/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const FundingPortalFounder = lazy(() => import('./components/FundingPortalFounder').then((m) => ({ default: m.FundingPortalFounder })));
const FundingPortalInvestor = lazy(() => import('./components/FundingPortalInvestor').then((m) => ({ default: m.FundingPortalInvestor })));
const DealRoomPage = lazy(() => import('./components/DealRoomPage').then((m) => ({ default: m.DealRoomPage })));
const EventsPage = lazy(() => import('./components/EventsPage').then((m) => ({ default: m.EventsPage })));
const PodcastsPage = lazy(() => import('./components/PodcastsPage').then((m) => ({ default: m.PodcastsPage })));
const NewsFeedPage = lazy(() => import('./components/NewsFeedPage').then((m) => ({ default: m.NewsFeedPage })));
const HelpSupportPage = lazy(() => import('./components/HelpSupportPage').then((m) => ({ default: m.HelpSupportPage })));
const CommunitiesPage = lazy(() => import('./components/CommunitiesPage'));
const PitchDeckSummarizerPage = lazy(() => import('./components/PitchDeckSummarizerPage').then((m) => ({ default: m.PitchDeckSummarizerPage })));
const StartupSummaryGeneratorPage = lazy(() => import('./components/StartupSummaryGeneratorPage').then((m) => ({ default: m.StartupSummaryGeneratorPage })));
const ProfileSummarizerPage = lazy(() => import('./components/ProfileSummarizerPage').then((m) => ({ default: m.ProfileSummarizerPage })));

const FeaturesPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.FeaturesPage })));
const HowItWorksPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.HowItWorksPage })));
const AIToolsPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.AIToolsPage })));
const EventsInfoPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.EventsInfoPage })));
const PricingPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.PricingPage })));
const IndustryCommunityPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.IndustryCommunityPage })));
const GrowthTrackingPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.GrowthTrackingPage })));
const SecurityInfoPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.SecurityInfoPage })));
const TestimonialsPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.TestimonialsPage })));
const WhyChooseUsPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.WhyChooseUsPage })));
const AboutPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.AboutPage })));
const RolesPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.RolesPage })));
const AfterSignupPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.AfterSignupPage })));
const FAQPage = lazy(() => import('./components/MarketingPages').then((m) => ({ default: m.FAQPage })));
const SubscriptionPage = lazy(() => import('./components/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const PremiumPaywall = lazy(() => import('./components/PremiumPaywall').then((m) => ({ default: m.PremiumPaywall })));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidMount() {
    setTimeout(() => {
      sessionStorage.removeItem('chunk_failed_reload');
    }, 2000);
  }

  componentDidCatch(error: Error) {
    console.error(error);
    const chunkFailedMessage = /Failed to fetch dynamically imported module/i;
    if (error?.message && chunkFailedMessage.test(error.message)) {
      if (!sessionStorage.getItem('chunk_failed_reload')) {
        sessionStorage.setItem('chunk_failed_reload', 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.error) {
      const chunkFailedMessage = /Failed to fetch dynamically imported module/i;
      if (this.state.error.message && chunkFailedMessage.test(this.state.error.message)) {
        if (!sessionStorage.getItem('chunk_failed_reload')) {
          return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-white">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium">Updating application...</p>
              </div>
            </div>
          );
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-lg border border-red-200 bg-white p-5 text-slate-900">
            <div className="text-lg font-semibold">Something went wrong</div>
            <div className="mt-2 text-sm text-slate-700">{this.state.error.message || 'Unknown error'}</div>
            <button
              className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                sessionStorage.removeItem('chunk_failed_reload');
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [hash, setHash] = useState(window.location.hash);
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigationHistoryRef = useRef<Set<string>>(new Set());

  // App-wide notification listener: subscribes to the socket 'notification_received'
  // event and surfaces it as an in-app toast, a desktop browser popup, and a native
  // mobile (Capacitor LocalNotifications) notification. Mounted here so it works on
  // every screen, not just the settings tab.
  usePushNotifications();

  // Whenever we have a logged-in user, (re)register the singleton socket so the
  // backend joins it to the user's notification room. Covers the case where the
  // socket connected before login (so the on-connect register had no token yet).
  useEffect(() => {
    if (user && !user.isGuest) {
      const token = localStorage.getItem('token');
      if (token) {
        try { getSocket().emit('register', token); } catch { /* ignore */ }
      }
    }
  }, [user]);

  // ── In-App Purchase (StoreKit via RevenueCat) lifecycle ──────────────────
  // Listen for entitlement changes once; refresh the cached premium flag whenever
  // the logged-in user changes (login / logout / restore / renewal).
  useEffect(() => { startPremiumListener(); }, []);
  useEffect(() => {
    if (user?.id) refreshPremium(user.id);
    else { clearPremiumFlag(); logoutPurchases(); }
  }, [user]);
  // Tracks whether a mobile-web visitor has already been bounced to #login once.

  // 1. Initial configuration and data loading
  useEffect(() => {
    // The app renders a blank splash until `loading` clears. That used to happen
    // only in the fetch's `finally`, so an unreachable or cold-starting API (the
    // hosted backend can take ~50s to wake) left users on a white screen with no
    // error. Boot the UI after a short grace period regardless; settings still
    // apply if/when the request lands.
    const bootTimer = setTimeout(() => setLoading(false), 4000);

    const fetchSettings = async () => {
      try {
        const apiBase = getSingletonApiBase(import.meta.env.VITE_API_URL);
        const res = await fetch(`${apiBase}/public/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          if (data.maintenanceMode && !window.location.hash.includes('admin')) {
            setMaintenance(true);
          }
        }
      } catch (err) { 
        console.error('Failed to fetch settings:', err); 
      } finally { 
        clearTimeout(bootTimer);
        setLoading(false); 
      }
    };
    fetchSettings();

    // Validate any persisted session on load: enforces idle/absolute timeouts,
    // honours "remember me", and silently refreshes an expired access token.
    (async () => {
      const validUser = await validateSession();
      if (validUser) setUser(validUser);
    })();

    return () => clearTimeout(bootTimer);
  }, []);

  // Re-check the session whenever the tab regains focus/visibility (the key
  // case: returning to the mobile web app after hours) and keep the idle clock
  // fresh on real user interaction.
  useEffect(() => {
    const enforce = () => {
      if (getSessionExpiryReason()) {
        logout();
        setUser(null);
        if (!window.location.hash.includes('admin')) window.location.hash = 'login';
      } else {
        markActivity();
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') enforce(); };
    const onActivity = () => markActivity();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', enforce);
    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('touchstart', onActivity, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', enforce);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('touchstart', onActivity);
    };
  }, []);

  // 2. Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    const onProfileCreated = (data: any) => {
      const profileTypeLabel = data.profileType === 'founder' ? 'Founder' :
        data.profileType === 'expert' ? 'Expert' :
          'Investor';
      toast.success(`${data.userName} created their ${profileTypeLabel} profile! 🎉`, {
        duration: 4000,
      });
    };

    socket.on('profile_created', onProfileCreated);
    return () => {
      socket.off('profile_created', onProfileCreated);
    };
  }, []);

  // Android Hardware Back Button Handler
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const listener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Detect if native Google/Apple sign-in is active (by checking if Google/Apple button is loading/disabled)
        const activeButtons = Array.from(document.querySelectorAll('button[disabled]'));
        const isAuthenticating = activeButtons.some(btn => 
          btn.textContent?.toLowerCase().includes('google') || 
          btn.textContent?.toLowerCase().includes('apple')
        );

        if (isAuthenticating) {
          console.log('[NativeAuth] Back button ignored during active native authentication flow');
          return;
        }

        if (canGoBack) {
          window.history.back();
        } else {
          const currentHash = window.location.hash.replace('#', '');
          if (currentHash === '' || currentHash === 'home' || currentHash === 'login' || currentHash.endsWith('-dashboard')) {
            console.log('[NativeAuth] Back button ignored at root page to prevent exit/minimize');
          } else {
            // Instead of minimizing, go back to dashboard or login
            if (user && !user.isGuest) {
              window.location.hash = `#${user.role}-dashboard`;
            } else {
              window.location.hash = '#login';
            }
          }
        }
      });

      return () => {
        listener.then(l => l.remove()).catch(() => {});
      };
    }
  }, [user]);

  // 3. Hash routing engine and page-reload redirect.

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.slice(1) || 'home';
      const prevHash = currentPage;
      setHash(window.location.hash);

      // Adopt an in-app login: LoginPage/SignupPage only write localStorage and
      // change the hash — they don't update this component's `user`. Without this,
      // `user` stays null after Sign in with Apple/Google/email until a cold
      // restart, so every user-gated redirect below (and #home) bounces the
      // just-logged-in user back to #login — the Apple 2.1(a) "returned to the
      // previous screen" bug. Re-reading the persisted user here, combined with
      // this effect re-running on [user] (line ~387 calls handleHashChange again),
      // makes `user` self-heal on the navigation that login itself triggers.
      if (!user) {
        const storedUser = getCurrentUser();
        // Guard with the same expiry check validateSession uses, so a stale/expired
        // token on cold start isn't briefly adopted as a live session.
        if (storedUser && !getSessionExpiryReason()) {
          setUser(storedUser);
          return; // bail; the [user] change re-invokes this handler with fresh state
        }
      }

      // Auto-bypass maintenance if navigating to admin
      if (window.location.hash.includes('admin')) setMaintenance(false);

      // Native app landing-page bypass. The marketing landing page must NEVER
      // render inside the native iOS/Android app (Apple 3.1.1/4.2 + a cleaner
      // app shell). Mobile WEB browsers (incl. Android Chrome) keep the landing
      // page — it is responsive and is the public marketing site.
      const isNativeApp = Capacitor.isNativePlatform();
      if (isNativeApp && (h === 'home' || h === '')) {
        // Logged-in users go straight to their dashboard; otherwise to login.
        window.location.hash = user && !user.isGuest ? `#${user.role}-dashboard` : '#login';
        return;
      }

      // Track navigation history
      const authenticatedPages = ['my-startup', 'founder-dashboard', 'expert-dashboard', 'investor-dashboard', 'admin-dashboard', 'events', 'podcasts', 'news-feed', 'profile', 'funding-portal-founder', 'funding-portal-investor', 'deal-room', 'community-chat', 'help-support', 'pitch-deck-summarizer', 'startup-summary-generator', 'profile-summarizer', 'admin-panel'];
      const isAuthenticatedPage = authenticatedPages.some(page => h.startsWith(page) || h === page);

      if (isAuthenticatedPage && h !== prevHash) {
        navigationHistoryRef.current.add(h);
      }

      // Redirect logged-in users from landing page
      if (user && !user.isGuest && (h === 'home' || h === '')) {
        window.location.hash = `#${user.role}-dashboard`;
        return;
      }

      // Hide logout confirm when navigating
      if (h !== 'home' && h !== '') {
        setShowLogoutConfirm(false);
      }

      // Auth redirect check
      if (user && !user.isGuest && (h === 'login' || h === 'signup')) {
        window.location.hash = `#${user.role}-dashboard`;
        return;
      }

      // Guest guard
      const authenticatedAppPages = [
        'founder-dashboard', 'expert-dashboard', 'investor-dashboard', 'admin-dashboard',
        'my-startup', 'community-chat', 'podcasts', 'news-feed', 'profile',
        'funding-portal-founder', 'funding-portal-investor', 'deal-room',
        'help-support', 'pitch-deck-summarizer', 'startup-summary-generator',
        'profile-summarizer', 'admin-panel'
      ];
      const isTryingToAccessRestricted = authenticatedAppPages.some(p => h === p || h.startsWith(p));
      if (user?.isGuest && isTryingToAccessRestricted) {
        window.location.hash = '#events';
        return;
      }

      // Map hash to currentPage
      let nextHash = h;
      if (h.startsWith('community-chat/')) {
        nextHash = 'community-chat';
      } else if (h === 'admin-panel') {
        nextHash = 'admin-dashboard';
      } else if (h.startsWith('my-startup')) {
        nextHash = 'my-startup';
      }

      // Only update state if it actually changed to avoid re-render loops
      if (nextHash !== currentPage) {
        setCurrentPage(nextHash);
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Sync initial hash state
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, currentPage]);

  if (maintenance) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Under Maintenance</h1>
        <p className="text-gray-400 max-w-md mb-8">
          NextIgnition is currently undergoing scheduled maintenance to bring you new features. 
          We'll be back online shortly!
        </p>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-3">
          <div className="text-blue-400 text-sm font-semibold">Contact Support:</div>
          <a href={`mailto:${settings.supportEmail || 'support@nextignition.io'}`} className="text-white text-sm hover:underline">
            {settings.supportEmail || 'support@nextignition.io'}
          </a>
        </div>
        {/* Hidden button for admin bypass if they know the hash */}
        <button onClick={() => window.location.hash = '#admin-panel'} className="mt-20 opacity-0 cursor-default">Admin</button>
      </div>
    );
  }

  if (loading) return <MobileSplashScreen />;

  // Helper to render the actual page content
  const renderPageContent = () => {
    // iOS (fully-free app — Apple Guideline 3.1.1): the public marketing site and
    // every pricing surface must NEVER render inside the app. An iPad is wide
    // enough to slip past width-based "mobile" detection, so we gate on PLATFORM,
    // not screen size. Bounce to the dashboard (logged in) or login (logged out).
    // Auth/compliance pages (login, signup, terms, privacy, contact,
    // delete-account, etc.) are intentionally NOT in this list.
    const IOS_BLOCKED_MARKETING_PAGES = [
      'home', '', 'features', 'how-it-works', 'ai-tools', 'events-info',
      'industry-community', 'growth-tracking', 'security-info', 'testimonials',
      'why-choose-us', 'about', 'roles', 'faq',
    ];
    if (Capacitor.getPlatform() === 'ios' && IOS_BLOCKED_MARKETING_PAGES.includes(currentPage)) {
      window.location.hash = user && !user.isGuest ? `#${user.role}-dashboard` : '#login';
      return <PageLoader />;
    }

    // Guest guard: render restricted pages as events page for guests
    const authenticatedAppPages = [
      'founder-dashboard', 'expert-dashboard', 'investor-dashboard', 'admin-dashboard',
      'my-startup', 'community-chat', 'podcasts', 'news-feed', 'profile',
      'funding-portal-founder', 'funding-portal-investor', 'deal-room',
      'help-support', 'pitch-deck-summarizer', 'startup-summary-generator',
      'profile-summarizer', 'admin-panel'
    ];
    
    const isRestrictedPage = authenticatedAppPages.some(p => currentPage === p || currentPage.startsWith(p));
    
    if (user?.isGuest && isRestrictedPage) {
      return (
        <Suspense fallback={<PageLoader />}>
          <EventsPage />
        </Suspense>
      );
    }

    // Render based on current page
    if (currentPage === 'login') {
      return (
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
      );
    }

    if (currentPage === 'signup') {
      return (
        <Suspense fallback={<PageLoader />}>
          <SignupPage />
        </Suspense>
      );
    }

    if (currentPage === 'register') {
      return (
        <Suspense fallback={<PageLoader />}>
          <PublicRegistrationPage />
        </Suspense>
      );
    }

    if (currentPage === 'event-survey') {
      return (
        <Suspense fallback={<PageLoader />}>
          <EventSurveyPage />
        </Suspense>
      );
    }

    if (currentPage === 'detailed-signup') {
      return (
        <Suspense fallback={<PageLoader />}>
          <DetailedSignupPage />
        </Suspense>
      );
    }

    if (currentPage === 'complete-profile') {
      return (
        <Suspense fallback={<PageLoader />}>
          <ProfileCompletionPage />
        </Suspense>
      );
    }

    if (currentPage === 'terms') {
      return (
        <Suspense fallback={<PageLoader />}>
          <TermsPage />
        </Suspense>
      );
    }

    if (currentPage === 'privacy') {
      return (
        <Suspense fallback={<PageLoader />}>
          <PrivacyPage />
        </Suspense>
      );
    }

    if (currentPage === 'cookie-policy') {
      return (
        <Suspense fallback={<PageLoader />}>
          <CookiePolicyPage />
        </Suspense>
      );
    }

    if (currentPage === 'contact') {
      return (
        <Suspense fallback={<PageLoader />}>
          <ContactPage />
        </Suspense>
      );
    }

    if (currentPage === 'delete-account') {
      return (
        <Suspense fallback={<PageLoader />}>
          <DeleteAccountPage />
        </Suspense>
      );
    }

    if (currentPage === 'features') {
      return (
        <Suspense fallback={<PageLoader />}>
          <FeaturesPage />
        </Suspense>
      );
    }

    if (currentPage === 'how-it-works') {
      return (
        <Suspense fallback={<PageLoader />}>
          <HowItWorksPage />
        </Suspense>
      );
    }

    if (currentPage === 'ai-tools') {
      return (
        <Suspense fallback={<PageLoader />}>
          <AIToolsPage />
        </Suspense>
      );
    }

    if (currentPage === 'events-info') {
      return (
        <Suspense fallback={<PageLoader />}>
          <EventsInfoPage />
        </Suspense>
      );
    }

    if (currentPage === 'pricing') {
      // iOS: #pricing is the StoreKit IAP paywall (Premium). Apple requires digital
      // subscriptions to be sold via In-App Purchase (Guideline 3.1.1). Web/Android
      // keep the existing SubscriptionPage / PricingPage below.
      if (Capacitor.getPlatform() === 'ios') {
        if (!user) { window.location.hash = '#login'; return <PageLoader />; }
        return (
          <Suspense fallback={<PageLoader />}>
            <PremiumPaywall />
          </Suspense>
        );
      }
      if (user) {
        return (
          <Suspense fallback={<PageLoader />}>
            <SubscriptionPage />
          </Suspense>
        );
      }
      return (
        <Suspense fallback={<PageLoader />}>
          <PricingPage />
        </Suspense>
      );
    }

    if (currentPage === 'industry-community') {
      return (
        <Suspense fallback={<PageLoader />}>
          <IndustryCommunityPage />
        </Suspense>
      );
    }

    if (currentPage === 'growth-tracking') {
      return (
        <Suspense fallback={<PageLoader />}>
          <GrowthTrackingPage />
        </Suspense>
      );
    }

    if (currentPage === 'security-info') {
      return (
        <Suspense fallback={<PageLoader />}>
          <SecurityInfoPage />
        </Suspense>
      );
    }

    if (currentPage === 'testimonials') {
      return (
        <Suspense fallback={<PageLoader />}>
          <TestimonialsPage />
        </Suspense>
      );
    }

    if (currentPage === 'why-choose-us') {
      return (
        <Suspense fallback={<PageLoader />}>
          <WhyChooseUsPage />
        </Suspense>
      );
    }

    if (currentPage === 'about') {
      return (
        <Suspense fallback={<PageLoader />}>
          <AboutPage />
        </Suspense>
      );
    }

    if (currentPage === 'roles') {
      return (
        <Suspense fallback={<PageLoader />}>
          <RolesPage />
        </Suspense>
      );
    }

    if (currentPage === 'after-signup') {
      return (
        <Suspense fallback={<PageLoader />}>
          <AfterSignupPage />
        </Suspense>
      );
    }

    if (currentPage === 'faq') {
      return (
        <Suspense fallback={<PageLoader />}>
          <FAQPage />
        </Suspense>
      );
    }

    if (currentPage === 'founder-dashboard') {
      return (
        <Suspense fallback={<PageLoader />}>
          <FounderDashboard />
        </Suspense>
      );
    }

    if (currentPage === 'expert-dashboard') {
      return (
        <Suspense fallback={<PageLoader />}>
          <ExpertDashboard />
        </Suspense>
      );
    }

    if (currentPage === 'investor-dashboard') {
      return (
        <Suspense fallback={<PageLoader />}>
          <InvestorDashboard />
        </Suspense>
      );
    }

    if (currentPage === 'admin-dashboard') {
      // Always gate through login first; backend JWT validates every request anyway
      if (!adminToken) {
        return (
          <Suspense fallback={<PageLoader />}>
            <AdminPanel onLogin={(token, name) => {
              localStorage.setItem('adminToken', token);
              localStorage.setItem('adminName', name);
              setAdminToken(token);
              setCurrentPage('admin-dashboard');
              window.location.hash = 'admin-dashboard';
            }} />
          </Suspense>
        );
      }
      // Token present → show the rich dashboard (JWT is re-verified server-side on every call)
      return (
        <Suspense fallback={<PageLoader />}>
          <AdminDashboard onLogout={() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminName');
            setAdminToken(null);
            setCurrentPage('home');
            window.location.hash = 'home';
          }} />
        </Suspense>
      );
    }

    if (currentPage.startsWith('my-startup')) {
      return (
        <Suspense fallback={<PageLoader />}>
          <MyStartupEditorPage />
        </Suspense>
      );
    }

    if (currentPage.startsWith('startup/')) {
      return (
        <Suspense fallback={<PageLoader />}>
          <StartupPublicPage />
        </Suspense>
      );
    }

    if (currentPage.startsWith('post/')) {
      return (
        <Suspense fallback={<PageLoader />}>
          <SharedPostPage />
        </Suspense>
      );
    }

    if (currentPage.startsWith('profile/')) {
      const parts = currentPage.split('/');
      const roleFromPath = parts[1];
      const idFromPath = parts[2];

      if (roleFromPath === 'admin') {
        return (
          <Suspense fallback={<PageLoader />}>
            <AdminPanel onLogin={(token, name) => {
              localStorage.setItem('adminToken', token);
              localStorage.setItem('adminName', name);
              setAdminToken(token);
              setCurrentPage('admin-dashboard');
              window.location.hash = 'admin-dashboard';
            }} />
          </Suspense>
        );
      }

      const userRole = roleFromPath as 'founder' | 'expert' | 'investor';
      const currentUser = getCurrentUser();
      const currentId = currentUser?.id || currentUser?._id;
      const isOwnProfile = !idFromPath || currentId === idFromPath;

      return (
        <Suspense fallback={<PageLoader />}>
          <ProfilePage
            userRole={userRole}
            userId={idFromPath}
            isOwnProfile={isOwnProfile}
          />
        </Suspense>
      );
    }

    if (currentPage === 'funding-portal-founder') {
      return (
        <Suspense fallback={<PageLoader />}>
          <FundingPortalFounder />
        </Suspense>
      );
    }

    if (currentPage === 'funding-portal-investor') {
      return (
        <Suspense fallback={<PageLoader />}>
          <FundingPortalInvestor />
        </Suspense>
      );
    }

    if (currentPage === 'deal-room') {
      return (
        <Suspense fallback={<PageLoader />}>
          <DealRoomPage />
        </Suspense>
      );
    }

    if (currentPage === 'events') {
      return (
        <Suspense fallback={<PageLoader />}>
          <EventsPage />
        </Suspense>
      );
    }

    if (currentPage === 'podcasts') {
      return (
        <Suspense fallback={<PageLoader />}>
          <PodcastsPage />
        </Suspense>
      );
    }

    if (currentPage === 'news-feed') {
      return (
        <Suspense fallback={<PageLoader />}>
          <NewsFeedPage />
        </Suspense>
      );
    }

    if (currentPage === 'help-support') {
      return (
        <Suspense fallback={<PageLoader />}>
          <HelpSupportPage />
        </Suspense>
      );
    }

    if (currentPage === 'community-chat') {
      const communityId = window.location.hash.split('/')[1];
      return (
        <Suspense fallback={<PageLoader />}>
          <CommunitiesPage userRole={user?.role || 'founder'} userId={user?.id || ''} initialCommunityId={communityId} />
        </Suspense>
      );
    }

    if (currentPage === 'pitch-deck-summarizer') {
      return (
        <Suspense fallback={<PageLoader />}>
          <PitchDeckSummarizerPage />
        </Suspense>
      );
    }

    if (currentPage === 'startup-summary-generator') {
      return (
        <Suspense fallback={<PageLoader />}>
          <StartupSummaryGeneratorPage />
        </Suspense>
      );
    }

    if (currentPage === 'profile-summarizer') {
      return (
        <Suspense fallback={<PageLoader />}>
          <ProfileSummarizerPage />
        </Suspense>
      );
    }

    // On iOS the public marketing landing page must NEVER render (Apple 3.1.1 +
    // 4.2). The top-of-function guard catches #home/#''; this backstop also covers
    // any unmatched hash that falls through to the default landing return — e.g.
    // on iPad, which slips past width-based mobile detection. Bounce to
    // dashboard/login instead of showing the marketing site.
    const isIos = Capacitor.getPlatform() === 'ios';
    if (isIos) {
      window.location.hash = user && !user.isGuest ? `#${user.role}-dashboard` : '#login';
      return <PageLoader />;
    }
    return (
      <div className="min-h-screen relative w-full overflow-x-hidden" style={{ willChange: 'scroll-position' }}>
        <HeroSection />
        <FeaturesSection />
        <JourneySection />
        <RolesSection />
        <AIToolsSection />
        <CommunitySection />
        <EventsSection />
        <GrowthTrackingSection />
        <SecuritySection />
        <SuccessStoriesSection />
        <WhyChooseSection />
        <MissionSection />
        {!isIos && <PricingSection />}
        <FAQSection />
        <Footer />
      </div>
    );
  };

  const handleLogoutConfirm = () => {
    logout();
    setUser(null);
    setShowLogoutConfirm(false);
    navigationHistoryRef.current.clear();
    window.location.hash = 'home';
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
    // Navigate back to the user's dashboard
    if (user?.role) {
      window.location.hash = `${user.role}-dashboard`;
    }
  };

  // Logout Confirmation Dialog Component
  const LogoutConfirmDialog = () => {
    if (!showLogoutConfirm) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md mx-4 p-6 bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
          <button
            onClick={handleLogoutCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 mb-4 bg-amber-100 rounded-full flex items-center justify-center">
              <LogOut className="w-8 h-8 text-amber-600" />
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Do you want to sign out?
            </h2>

            <p className="text-gray-600 mb-6">
              You're about to leave your account. Sign out to end your session or stay logged in to continue.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={handleLogoutCancel}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                No, Stay Logged In
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      {/* PWA update prompt is web-only — a service-worker update UI has no place
          in the native app (and avoids registering a SW inside the WKWebView). */}
      {!Capacitor.isNativePlatform() && <PWAUpdatePrompt />}
      {showLogoutConfirm && <LogoutConfirmDialog />}
      <MobileSplashScreen>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            {renderPageContent()}
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </MobileSplashScreen>
    </ErrorBoundary>
  );
}