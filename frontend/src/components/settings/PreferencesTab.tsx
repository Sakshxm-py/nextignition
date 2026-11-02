import { Sparkles, Clock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { brandColors } from '../../utils/colors';

export function PreferencesTab({ userRole: _userRole }: any) {
  const isIOS = Capacitor.getPlatform() === 'ios';

  return (
    <div className="max-w-4xl relative">
      {/* ━━━ COMING SOON OVERLAY (hidden on iOS) ━━━ */}
      {!isIOS && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(255,255,255,0.75)' }}
        >
          <div className="text-center px-8 py-12">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
            >
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Funnel Display, sans-serif' }}>
              Coming Soon
            </h2>
            <p className="text-gray-600 max-w-sm mx-auto mb-6 leading-relaxed">
              We're building a powerful preferences experience — language, timezone, feed customization, and more. Stay tuned!
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
            >
              <Clock className="w-4 h-4" />
              In Development
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Preferences (read-only current settings) ━━━ */}
      {/* On non-iOS the section sits blurred behind the Coming Soon overlay above. */}
      <div className={isIOS ? '' : 'pointer-events-none select-none opacity-40'}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Preferences</h1>
          <p className="text-gray-600">Your current NextIgnition experience settings</p>
        </div>

        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Language &amp; Region</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">English</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">(GMT+5:30) Mumbai, Kolkata, Chennai</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date Format</label>
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">DD/MM/YYYY</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Time Format</label>
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">12-hour (AM/PM)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold mb-6">Feed &amp; Content</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium">⚡ Personalized Feed</p>
                <p className="text-sm text-gray-600">AI-recommended content based on your interests</p>
              </div>
              <span className="text-sm font-medium text-green-600">On</span>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium">📅 Chronological Feed</p>
                <p className="text-sm text-gray-600">Latest posts first</p>
              </div>
              <span className="text-sm font-medium text-gray-500">Off</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
