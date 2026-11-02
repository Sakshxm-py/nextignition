import { useEffect, useState } from 'react';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { getPrivacySettings, updatePrivacySettings, requestDataExport } from '../../services/authService';

interface PrivacySettings {
  profileVisibility: 'public' | 'members' | 'connections';
  whoCanMessage: 'everyone' | 'connections' | 'no_one';
  allowMessageRequests: boolean;
}

const defaultSettings: PrivacySettings = {
  profileVisibility: 'public',
  whoCanMessage: 'everyone',
  allowMessageRequests: true,
};

export function PrivacyDataTab({ userRole }: any) {
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    getPrivacySettings()
      .then((data) => setSettings({ ...defaultSettings, ...data }))
      .catch(() => console.warn('Could not load privacy settings'));
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updatePrivacySettings(settings);
      setStatus({ type: 'success', message: 'Privacy settings saved successfully' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to save privacy settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const result = await requestDataExport();
      // Trigger JSON file download
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nextignition-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', message: 'Data export downloaded successfully' });
    } catch {
      setStatus({ type: 'error', message: 'Failed to export data. Please try again.' });
    } finally {
      setExportLoading(false);
    }
  };

  const visibilityOptions: { value: PrivacySettings['profileVisibility']; label: string; description: string; emoji: string }[] = [
    { value: 'public', label: 'Public', description: 'Anyone on the internet can see your profile', emoji: '🌐' },
    { value: 'members', label: 'NextIgnition Members Only', description: 'Only registered members can view', emoji: '🔗' },
    { value: 'connections', label: 'Connections Only', description: "Only people you're connected with", emoji: '👥' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Privacy &amp; Data</h1>
        <p className="text-gray-600">Control who can see your information</p>
      </div>

      {status.message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium">{status.message}</p>
          <button onClick={() => setStatus({ type: '', message: '' })} className="ml-auto text-sm opacity-50 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Profile Visibility */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Profile Visibility</h2>
        <div className="space-y-3">
          {visibilityOptions.map((opt) => (
            <label key={opt.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={settings.profileVisibility === opt.value}
                onChange={() => setSettings(prev => ({ ...prev, profileVisibility: opt.value }))}
                className="mt-1"
                style={{ accentColor: brandColors.electricBlue }}
              />
              <div>
                <p className="font-medium">{opt.emoji} {opt.label}</p>
                <p className="text-sm text-gray-600">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Contact & Messaging */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Contact &amp; Messaging</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Who Can Message You</label>
            <select
              name="select-who-can-message"
              value={settings.whoCanMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, whoCanMessage: e.target.value as PrivacySettings['whoCanMessage'] }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="everyone">Everyone</option>
              <option value="connections">Connections Only</option>
              <option value="no_one">No One</option>
            </select>
          </div>
          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer">
            <div>
              <p className="font-medium">Message Requests</p>
              <p className="text-sm text-gray-600">Allow non-connections to send requests</p>
            </div>
            <input
              name="input-message-requests"
              type="checkbox"
              checked={settings.allowMessageRequests}
              onChange={(e) => setSettings(prev => ({ ...prev, allowMessageRequests: e.target.checked }))}
              style={{ accentColor: brandColors.electricBlue }}
            />
          </label>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Data Management</h2>
        <div className="p-4 border border-gray-200 rounded-lg">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Download className="w-5 h-5" style={{ color: brandColors.electricBlue }} />
            Download Your Data
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Request a copy of your profile, posts, messages, and analytics
          </p>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50"
            style={{ background: brandColors.electricBlue }}
          >
            {exportLoading ? 'Preparing Export...' : 'Request Data Export'}
          </button>
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-red-50 rounded-xl p-6 mb-6 shadow-sm border border-red-100">
        <h2 className="text-xl font-bold mb-2 text-red-700">Delete Account</h2>
        <p className="text-red-600 mb-4 text-sm mt-1">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => window.location.hash = 'delete-account'}
          className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition"
        >
          Delete Account
        </button>
      </div>

      {/* Actions */}
      <div className="flex justify-end bg-white rounded-xl p-6 shadow-sm">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 rounded-lg font-bold text-white disabled:opacity-50"
          style={{ background: brandColors.electricBlue }}
        >
          {loading ? 'Saving...' : 'Save Privacy Settings'}
        </button>
      </div>
    </div>
  );
}
