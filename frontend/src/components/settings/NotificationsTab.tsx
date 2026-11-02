import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Mail, Smartphone, Monitor, Clock, CheckCircle, AlertTriangle, BellOff, BellRing, Save } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { updateNotificationSettings, fetchNotificationSettings, getCurrentUser, setCurrentUser } from '../../services/authService';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface NotificationsTabProps {
  userRole: 'founder' | 'expert' | 'investor';
}

export function NotificationsTab({ userRole }: NotificationsTabProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [settings, setSettings] = useState<any>({
    social: { enabled: true, likes: { email: true, push: true, inApp: true }, comments: { email: true, push: true, inApp: true }, followers: { email: true, push: false, inApp: true }, mentions: { email: true, push: true, inApp: true }, reposts: { email: false, push: true, inApp: true } },
    messages: { enabled: true, direct: { email: true, push: true, inApp: true }, group: { email: true, push: true, inApp: true }, requests: { email: true, push: false, inApp: true } },
    communities: { enabled: true, mentions: { email: true, push: true, inApp: true }, replies: { email: true, push: false, inApp: true }, announcements: { email: true, push: false, inApp: true }, digest: 'Real-time' },
    funding: { enabled: true, views: { email: true, push: true, inApp: true }, pipeline: { email: true, push: true, inApp: true }, meetings: { email: true, push: true, inApp: true }, documents: { email: true, push: true, inApp: true }, status: { email: true, push: true, inApp: true } },
    expert: { enabled: true, bookings: { email: true, push: true, inApp: true }, confirmations: { email: true, push: true, inApp: true }, reminders: { email: true, push: true, inApp: true }, cancellations: { email: true, push: true, inApp: true }, payments: { email: true, push: false, inApp: true }, reviews: { email: true, push: false, inApp: true } },
    investor: { enabled: true, matches: { email: true, push: true, inApp: true }, targetSpecs: { email: true, push: false, inApp: true }, listings: { email: true, push: false, inApp: true }, pitchUpdates: { email: true, push: true, inApp: true }, founderResponses: { email: true, push: true, inApp: true }, documents: { email: true, push: true, inApp: true } },
    events: { enabled: true, reminders: { email: true, push: true, inApp: true }, recommendations: { email: true, push: false, inApp: true }, cancellations: { email: true, push: true, inApp: true }, reminderTiming: 'Both' },
    platform: { enabled: true, product: { email: true, push: false, inApp: true }, newsletter: { email: true, push: false, inApp: false }, announcements: { email: true, push: false, inApp: true }, tips: { email: true, push: false, inApp: false } },
    schedule: { quietHours: { enabled: false, start: '22:00', end: '08:00', days: 'All days' }, dnd: { enabled: false, duration: 'Until tomorrow' } }
  });

  const { permission, requestPermission, showNotification } = usePushNotifications();

  const [isDirty, setIsDirty] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  const CACHE_KEY = 'notif_settings_cache';

  // Load: try server first, fall back to localStorage cache
  useEffect(() => {
    // 1. Load from localStorage cache immediately for instant render
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings((prev: any) => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }

    // 2. Fetch fresh data from server to override cache
    fetchNotificationSettings()
      .then((serverSettings) => {
        if (serverSettings) {
          setSettings((prev: any) => ({ ...prev, ...serverSettings }));
          localStorage.setItem(CACHE_KEY, JSON.stringify(serverSettings));
        }
      })
      .catch(() => {
        // Silently fall back to localStorage cache
      })
      .finally(() => {
        isFirstLoad.current = false;
      });
  }, []);

  // Auto-save: fires 1.5 seconds after the last change
  const scheduleSave = useCallback((newSettings: any) => {
    if (isFirstLoad.current) return;
    setIsDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setAutoSaving(true);
        await updateNotificationSettings(newSettings);
        // Persist to localStorage cache immediately
        localStorage.setItem(CACHE_KEY, JSON.stringify(newSettings));
        // Sync to localStorage user object
        const user = getCurrentUser();
        if (user) { user.notificationSettings = newSettings; setCurrentUser(user); }
        setIsDirty(false);
        setStatus({ type: 'success', message: 'Saved automatically ✓' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      } catch {
        setStatus({ type: 'error', message: 'Auto-save failed. Click "Save" to retry.' });
      } finally {
        setAutoSaving(false);
      }
    }, 1500);
  }, []);

  const handleSave = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      setLoading(true);
      await updateNotificationSettings(settings);
      localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
      const user = getCurrentUser();
      if (user) { user.notificationSettings = settings; setCurrentUser(user); }
      setIsDirty(false);
      setStatus({ type: 'success', message: 'Preferences saved successfully' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } catch {
      setStatus({ type: 'error', message: 'Failed to save preferences. Please try again.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (section: string, key: string, field: string, value: any) => {
    setSettings((prev: any) => {
      const next = {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: field === 'value' ? value : {
            ...prev[section][key],
            [field]: value
          }
        }
      };
      scheduleSave(next);
      return next;
    });
  };

  const updateSectionEnabled = (section: string, enabled: boolean) => {
    setSettings((prev: any) => {
      const next = { ...prev, [section]: { ...prev[section], enabled } };
      scheduleSave(next);
      return next;
    });
  };

  const handleTestNotification = async () => {
    if (permission !== 'granted') {
      const p = await requestPermission();
      if (p !== 'granted') return;
    }
    showNotification({
      title: '🔔 NextIgnition Test',
      body: 'Your notifications are working correctly!',
      url: window.location.href,
    });
  };

  const Toggle = ({ checked, onChange }: any) => (
    <label className="relative inline-block w-11 h-6 cursor-pointer">
      <input name="toggle-input" type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
      <div
        className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"
        style={checked ? { background: brandColors.electricBlue } : {}}
      ></div>
      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform shadow-sm"></div>
    </label>
  );

  const NotificationRow = ({ label, section, settingKey }: { label: string, section: string, settingKey: string }) => {
    const rowSettings = settings[section][settingKey];
    return (
      <div className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 items-center">
        <div className="col-span-1">
          <p className="text-sm font-medium text-gray-700">{label}</p>
        </div>
        <div className="flex justify-center">
          <input name={`email-${section}-${settingKey}`}
            type="checkbox"
            checked={!!rowSettings?.email}
            onChange={(e) => updateSetting(section, settingKey, 'email', e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: brandColors.electricBlue }}
          />
        </div>
        <div className="flex justify-center">
          <input name={`push-${section}-${settingKey}`}
            type="checkbox"
            checked={!!rowSettings?.push}
            onChange={(e) => updateSetting(section, settingKey, 'push', e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: brandColors.electricBlue }}
          />
        </div>
        <div className="flex justify-center">
          <input name={`inApp-${section}-${settingKey}`}
            type="checkbox"
            checked={!!rowSettings?.inApp}
            onChange={(e) => updateSetting(section, settingKey, 'inApp', e.target.checked)}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: brandColors.electricBlue }}
          />
        </div>
      </div>
    );
  };

  const SectionHeader = () => (
    <div className="grid grid-cols-4 gap-4 mb-3 pb-2 border-b border-gray-200">
      <div className="col-span-1" />
      <div className="flex flex-col items-center gap-1">
        <Mail className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-bold text-gray-600">Email</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Smartphone className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-bold text-gray-600">Push</p>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Monitor className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-bold text-gray-600">In-App</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-gray-600">Choose how and when you want to be notified</p>
        </div>
        {/* Auto-save status badge */}
        {autoSaving && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Saving...
          </div>
        )}
        {!autoSaving && !isDirty && !isFirstLoad.current && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
            <CheckCircle className="w-3.5 h-3.5" />
            All changes saved
          </div>
        )}
        {!autoSaving && isDirty && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-sm text-yellow-700">
            <Save className="w-3.5 h-3.5" />
            Unsaved changes
          </div>
        )}
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium">{status.message}</p>
          <button onClick={() => setStatus({ type: '', message: '' })} className="ml-auto text-sm opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── Push Notification Permission Banner ── */}
      <div className={`mb-6 p-5 rounded-xl border-2 flex items-start justify-between gap-4 ${permission === 'granted' ? 'bg-green-50 border-green-200' : permission === 'denied' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start gap-3">
          {permission === 'granted' ? (
            <BellRing className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          ) : permission === 'denied' ? (
            <BellOff className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Bell className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            {permission === 'granted' && (
              <>
                <p className="font-bold text-green-800">Browser notifications are enabled ✓</p>
                <p className="text-sm text-green-700 mt-0.5">You'll receive popup alerts on this device when notifications arrive.</p>
              </>
            )}
            {permission === 'denied' && (
              <>
                <p className="font-bold text-red-800">Browser notifications are blocked</p>
                <p className="text-sm text-red-700 mt-0.5">To enable them, allow notifications for NextIgnition in your device settings.</p>
              </>
            )}
            {permission === 'default' && (
              <>
                <p className="font-bold text-blue-800">Enable browser notifications</p>
                <p className="text-sm text-blue-700 mt-0.5">Get real-time popup alerts on your desktop when something important happens.</p>
              </>
            )}
            {permission === 'unsupported' && (
              <>
                <p className="font-bold text-gray-700">Browser notifications not supported</p>
                <p className="text-sm text-gray-600 mt-0.5">Your browser doesn't support desktop notifications. In-app notifications will still work.</p>
              </>
            )}
          </div>
        </div>
        {(permission === 'default' || permission === 'granted') && (
          <button
            onClick={handleTestNotification}
            className="flex-shrink-0 px-4 py-2 text-sm font-bold rounded-lg border-2 transition-all hover:shadow-md"
            style={permission === 'granted'
              ? { borderColor: brandColors.electricBlue, color: brandColors.electricBlue }
              : { background: brandColors.electricBlue, color: '#fff', border: 'none' }}
          >
            {permission === 'granted' ? 'Test Notification' : 'Enable Notifications'}
          </button>
        )}
      </div>

      {/* Section 1: Social Activity */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Social Activity</h2>
            <p className="text-sm text-gray-600">Notifications about your posts and social interactions</p>
          </div>
          <Toggle checked={settings.social.enabled} onChange={(e: any) => updateSectionEnabled('social', e.target.checked)} />
        </div>
        {settings.social.enabled && (
          <>
            <SectionHeader />
            <NotificationRow label="Likes on your posts" section="social" settingKey="likes" />
            <NotificationRow label="Comments on your posts" section="social" settingKey="comments" />
            <NotificationRow label="New followers" section="social" settingKey="followers" />
            <NotificationRow label="Mentions" section="social" settingKey="mentions" />
            <NotificationRow label="Repost of your content" section="social" settingKey="reposts" />
          </>
        )}
      </div>

      {/* Section 2: Messages & Communication */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Messages &amp; Communication</h2>
            <p className="text-sm text-gray-600">Direct messages and chat notifications</p>
          </div>
          <Toggle checked={settings.messages.enabled} onChange={(e: any) => updateSectionEnabled('messages', e.target.checked)} />
        </div>
        {settings.messages.enabled && (
          <>
            <SectionHeader />
            <NotificationRow label="New direct messages" section="messages" settingKey="direct" />
            <NotificationRow label="Group messages" section="messages" settingKey="group" />
            <NotificationRow label="Message requests" section="messages" settingKey="requests" />
          </>
        )}
      </div>

      {/* Section 3: Communities (Founder) */}
      {userRole === 'founder' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Communities</h2>
              <p className="text-sm text-gray-600">Notifications from community channels you've joined</p>
            </div>
            <Toggle checked={settings.communities.enabled} onChange={(e: any) => updateSectionEnabled('communities', e.target.checked)} />
          </div>
          {settings.communities.enabled && (
            <>
              <SectionHeader />
              <NotificationRow label="Channel mentions (@username)" section="communities" settingKey="mentions" />
              <NotificationRow label="Replies to your messages" section="communities" settingKey="replies" />
              <NotificationRow label="New announcements" section="communities" settingKey="announcements" />
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium mb-2">Digest Frequency</label>
                <select
                  value={settings.communities.digest}
                  onChange={(e) => updateSetting('communities', 'digest', 'value', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Real-time">Real-time</option>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Section 4: Funding & Investor Activity (Founder) */}
      {userRole === 'founder' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Funding &amp; Investor Activity</h2>
              <p className="text-sm text-gray-600">Updates about investors viewing your startup</p>
            </div>
            <Toggle checked={settings.funding.enabled} onChange={(e: any) => updateSectionEnabled('funding', e.target.checked)} />
          </div>
          {settings.funding.enabled && (
            <>
              <SectionHeader />
              <NotificationRow label="Investor views your pitch" section="funding" settingKey="views" />
              <NotificationRow label="Investor adds to pipeline" section="funding" settingKey="pipeline" />
              <NotificationRow label="Meeting requests" section="funding" settingKey="meetings" />
              <NotificationRow label="Document requests" section="funding" settingKey="documents" />
              <NotificationRow label="Funding status updates" section="funding" settingKey="status" />
            </>
          )}
        </div>
      )}

      {/* Section 5: Client & Booking Notifications (Expert) */}
      {userRole === 'expert' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Client &amp; Booking Notifications</h2>
              <p className="text-sm text-gray-600">Updates about your consultation sessions</p>
            </div>
            <Toggle checked={settings.expert.enabled} onChange={(e: any) => updateSectionEnabled('expert', e.target.checked)} />
          </div>
          {settings.expert.enabled && (
            <>
              <SectionHeader />
              <NotificationRow label="New booking requests" section="expert" settingKey="bookings" />
              <NotificationRow label="Booking confirmations" section="expert" settingKey="confirmations" />
              <NotificationRow label="Session reminders (1 hour before)" section="expert" settingKey="reminders" />
              <NotificationRow label="Client cancellations" section="expert" settingKey="cancellations" />
              <NotificationRow label="Payment received" section="expert" settingKey="payments" />
              <NotificationRow label="Client reviews posted" section="expert" settingKey="reviews" />
            </>
          )}
        </div>
      )}

      {/* Section 6: Deal Flow Notifications (Investor) */}
      {userRole === 'investor' && (
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">Deal Flow Notifications</h2>
              <p className="text-sm text-gray-600">AI-matched startups and deal updates</p>
            </div>
            <Toggle checked={settings.investor.enabled} onChange={(e: any) => updateSectionEnabled('investor', e.target.checked)} />
          </div>
          {settings.investor.enabled && (
            <>
              <SectionHeader />
              <NotificationRow label="New startup matches (AI)" section="investor" settingKey="matches" />
              <NotificationRow label="Startups in target industries" section="investor" settingKey="targetSpecs" />
              <NotificationRow label="Featured startup listings" section="investor" settingKey="listings" />
              <NotificationRow label="Pitch deck updates" section="investor" settingKey="pitchUpdates" />
              <NotificationRow label="Founder responses" section="investor" settingKey="founderResponses" />
              <NotificationRow label="Document uploads (Deal Room)" section="investor" settingKey="documents" />
            </>
          )}
        </div>
      )}

      {/* Section 7: Events */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Events</h2>
            <p className="text-sm text-gray-600">Reminders and updates about events</p>
          </div>
          <Toggle checked={settings.events.enabled} onChange={(e: any) => updateSectionEnabled('events', e.target.checked)} />
        </div>
        {settings.events.enabled && (
          <>
            <SectionHeader />
            <NotificationRow label="Event reminders" section="events" settingKey="reminders" />
            <NotificationRow label="New event recommendations" section="events" settingKey="recommendations" />
            <NotificationRow label="Event cancellations" section="events" settingKey="cancellations" />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium mb-2">Reminder Timing</label>
              <select
                value={settings.events.reminderTiming}
                onChange={(e) => updateSetting('events', 'reminderTiming', 'value', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1 hour before">1 hour before</option>
                <option value="1 day before">1 day before</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Section 8: Platform Updates */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Platform Updates</h2>
            <p className="text-sm text-gray-600">News and updates from NextIgnition</p>
          </div>
          <Toggle checked={settings.platform.enabled} onChange={(e: any) => updateSectionEnabled('platform', e.target.checked)} />
        </div>
        {settings.platform.enabled && (
          <>
            <SectionHeader />
            <NotificationRow label="Product updates" section="platform" settingKey="product" />
            <NotificationRow label="Newsletter (weekly digest)" section="platform" settingKey="newsletter" />
            <NotificationRow label="Feature announcements" section="platform" settingKey="announcements" />
            <NotificationRow label="Tips &amp; best practices" section="platform" settingKey="tips" />
          </>
        )}
      </div>

      {/* Section 9: Notification Schedule */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
          Notification Schedule
        </h2>

        {/* Quiet Hours */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Quiet Hours</h3>
              <p className="text-sm text-gray-600">Pause notifications during quiet hours</p>
            </div>
            <Toggle checked={settings.schedule.quietHours.enabled} onChange={(e: any) => {
              const newSchedule = { ...settings.schedule, quietHours: { ...settings.schedule.quietHours, enabled: e.target.checked } };
              setSettings((prev: any) => ({ ...prev, schedule: newSchedule }));
            }} />
          </div>
          {settings.schedule.quietHours.enabled && (
            <div className="pl-4 border-l-2 border-blue-500 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input name="quiet-hours-start"
                    type="time"
                    value={settings.schedule.quietHours.start}
                    onChange={(e) => {
                      const newQH = { ...settings.schedule.quietHours, start: e.target.value };
                      setSettings((prev: any) => ({ ...prev, schedule: { ...prev.schedule, quietHours: newQH } }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input name="quiet-hours-end"
                    type="time"
                    value={settings.schedule.quietHours.end}
                    onChange={(e) => {
                      const newQH = { ...settings.schedule.quietHours, end: e.target.value };
                      setSettings((prev: any) => ({ ...prev, schedule: { ...prev.schedule, quietHours: newQH } }));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Days</label>
                <select
                  value={settings.schedule.quietHours.days}
                  onChange={(e) => {
                    const newQH = { ...settings.schedule.quietHours, days: e.target.value };
                    setSettings((prev: any) => ({ ...prev, schedule: { ...prev.schedule, quietHours: newQH } }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All days">All days</option>
                  <option value="Weekdays only">Weekdays only</option>
                  <option value="Weekends only">Weekends only</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Do Not Disturb */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Do Not Disturb</h3>
              <p className="text-sm text-gray-600">Mute all notifications except critical ones</p>
            </div>
            <Toggle checked={settings.schedule.dnd.enabled} onChange={(e: any) => {
              const newSchedule = { ...settings.schedule, dnd: { ...settings.schedule.dnd, enabled: e.target.checked } };
              setSettings((prev: any) => ({ ...prev, schedule: newSchedule }));
            }} />
          </div>
          {settings.schedule.dnd.enabled && (
            <div className="pl-4 border-l-2" style={{ borderColor: brandColors.atomicOrange }}>
              <label className="block text-sm font-medium mb-2">Auto-disable in:</label>
              <select
                value={settings.schedule.dnd.duration}
                onChange={(e) => {
                  const newDND = { ...settings.schedule.dnd, duration: e.target.value };
                  setSettings((prev: any) => ({ ...prev, schedule: { ...prev.schedule, dnd: newDND } }));
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1 hour">1 hour</option>
                <option value="4 hours">4 hours</option>
                <option value="Until tomorrow">Until tomorrow</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm">
        <button
          onClick={handleTestNotification}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Bell className="w-4 h-4" />
          Send Test Notification
        </button>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-bold text-white disabled:opacity-50 transition-all hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.navyBlue})` }}
          >
            {loading ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}