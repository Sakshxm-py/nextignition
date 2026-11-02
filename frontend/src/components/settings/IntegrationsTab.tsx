import { Calendar, Video, MessageSquare, Check, Link2 } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { useEffect, useMemo, useState } from 'react';

export function IntegrationsTab({ userRole }: any) {
  const storageKey = useMemo(() => `integrations:${String(userRole || 'user')}`, [userRole]);

  const [connections, setConnections] = useState<Record<string, { connected: boolean; account?: string }>>({
    googleCalendar: { connected: false },
    outlookCalendar: { connected: false },
    zoom: { connected: false },
    slack: { connected: false },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setConnections((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const connect = (key: string) => {
    setConnections((prev) => ({
      ...prev,
      [key]: { connected: true },
    }));
  };

  const disconnect = (key: string) => {
    setConnections((prev) => ({
      ...prev,
      [key]: { connected: false },
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      localStorage.setItem(storageKey, JSON.stringify(connections));
      alert('Integration settings saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-gray-600">Connect your favorite tools and services</p>
      </div>

      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Calendar Integrations</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-bold">Google Calendar</p>
                <p className="text-sm text-gray-600">
                  {connections.googleCalendar?.connected
                    ? (connections.googleCalendar?.account || 'Connected')
                    : 'Not connected'}
                </p>
              </div>
            </div>
            {connections.googleCalendar?.connected ? (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
                <button
                  onClick={() => disconnect('googleCalendar')}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect('googleCalendar')}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: brandColors.electricBlue }}
              >
                Connect
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-bold">Outlook Calendar</p>
                <p className="text-sm text-gray-600">Sync meetings with experts/investors</p>
              </div>
            </div>
            {connections.outlookCalendar?.connected ? (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
                <button
                  onClick={() => disconnect('outlookCalendar')}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect('outlookCalendar')}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: brandColors.electricBlue }}
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Communication Tools</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-bold">Zoom</p>
                <p className="text-sm text-gray-600">One-click meeting scheduling</p>
              </div>
            </div>
            {connections.zoom?.connected ? (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
                <button
                  onClick={() => disconnect('zoom')}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect('zoom')}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: brandColors.electricBlue }}
              >
                Connect
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-purple-600" />
              <div>
                <p className="font-bold">Slack</p>
                <p className="text-sm text-gray-600">Get NextIgnition notifications in Slack</p>
              </div>
            </div>
            {connections.slack?.connected ? (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </span>
                <button
                  onClick={() => disconnect('slack')}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect('slack')}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: brandColors.electricBlue }}
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end bg-white rounded-xl p-6 shadow-sm">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2 rounded-lg font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: brandColors.electricBlue }}
        >
          {saving ? 'Saving...' : 'Save Integration Settings'}
        </button>
      </div>
    </div>
  );
}