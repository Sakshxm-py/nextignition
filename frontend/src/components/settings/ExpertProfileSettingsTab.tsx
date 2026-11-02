import { Briefcase, Award, DollarSign, Calendar, Clock, Users, Plus, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { brandColors } from '../../utils/colors';
import { useEffect, useState } from 'react';
import { updateProfile, getProfile } from '../../services/userService';
import { getCurrentUser } from '../../services/authService';
import { formatWithCommas, parseNumericValue } from '../../utils/formatters';

export function ExpertProfileSettingsTab({ userRole }: any) {
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [expertIndustries, setExpertIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [newSpec, setNewSpec] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [lastSaved, setLastSaved] = useState<string>('');

  useEffect(() => {
    const fetchProfile = async () => {
      const user = getCurrentUser();
      if (user) {
        const userId = user.id || user._id;
        if (!userId) {
          setLoading(false);
          return;
        }
        try {
          const profile = await getProfile(userId);
          const p = profile.profile || {};
          setSpecializations(p.expertise || []);
          setExperience(p.experience || '');
          setHourlyRate(String(p.hourlyRate || 0));
          setExpertIndustries(p.expertIndustries || []);

          if (profile.updatedAt) {
            setLastSaved(new Date(profile.updatedAt).toLocaleTimeString());
          }
        } catch (error) {
          console.error('Error fetching profile', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const expertData = {
        expertise: specializations,
        experience,
        hourlyRate: Number(hourlyRate),
        expertIndustries
      };

      await updateProfile(expertData);

      setLastSaved(new Date().toLocaleTimeString());
      setMessageType('success');
      setMessage('Expert settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessageType('error');
      setMessage('Failed to save settings. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const addSpecialization = () => {
    if (newSpec && !specializations.includes(newSpec)) {
      setSpecializations([...specializations, newSpec]);
      setNewSpec('');
    }
  };

  const addIndustry = () => {
    if (newIndustry && !expertIndustries.includes(newIndustry)) {
      setExpertIndustries([...expertIndustries, newIndustry]);
      setNewIndustry('');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading expert profile...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Expert Profile Settings</h1>
        <p className="text-gray-600">Manage your expertise and service offerings</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg border font-medium ${
          messageType === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* Section 1: Expertise & Credentials */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Expertise & Credentials</h2>

        <div className="space-y-4">
          {/* Areas of Specialization */}
          <div>
            <label className="block text-sm font-medium mb-2">Areas of Specialization</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {specializations.map((spec) => (
                <span key={spec} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ background: brandColors.electricBlue }}>
                  {spec}
                  <button onClick={() => setSpecializations(specializations.filter(s => s !== spec))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input name="input-e78f75"
                type="text"
                value={newSpec}
                onChange={(e) => setNewSpec(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSpecialization()}
                placeholder="Add specialization tag..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addSpecialization}
                className="px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: brandColors.electricBlue }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Years of Experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Years of Experience</label>
              <input name="input-3efd55"
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 10+ years"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Industries</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {expertIndustries.map(ind => (
                  <span key={ind} className="px-2 py-1 bg-gray-100 rounded text-xs flex items-center gap-1">
                    {ind}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setExpertIndustries(expertIndustries.filter(i => i !== ind))} />
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input name="input-ff6dc6"
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIndustry()}
                  placeholder="Add industry..."
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg"
                />
                <button
                  onClick={addIndustry}
                  className="p-1 px-2 bg-gray-200 rounded text-sm hover:bg-gray-300">
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Certifications placeholder */}
          {Capacitor.getPlatform() !== 'ios' && (
            <div>
              <label className="block text-sm font-medium mb-2">Certifications</label>
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
                <p className="text-sm text-gray-500">Certification management features coming soon</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Service Offerings */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Service Offerings</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Base Hourly Rate (₹)</label>
          <input name="input-4648a6"
            type="text"
            value={formatWithCommas(hourlyRate)}
            onChange={(e) => {
              const val = parseNumericValue(e.target.value);
              if (val === '' || /^\d+$/.test(val)) setHourlyRate(val);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Mentorship Packages placeholder */}
        <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center bg-gray-50">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h3 className="font-bold mb-1">Custom Packages</h3>
          <p className="text-sm text-gray-500">Soon you'll be able to create custom service packages for founders.</p>
        </div>
      </div>

      {/* Section 4: Revenue Settings Placeholder */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Revenue & Payouts</h2>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <h3 className="font-bold mb-2">Commission Structure</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">Service Fee</p>
              <p className="text-2xl font-bold" style={{ color: brandColors.electricBlue }}>15%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-700">Your earnings</p>
              <p className="text-2xl font-bold text-green-600">85%</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 italic">Payout history and bank settings will be available once you complete your first consultation.</p>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg relative md:sticky md:bottom-4 z-40 border border-gray-200 mt-8 mb-4">
        <div className="text-sm text-gray-500">
          {lastSaved ? `Last saved at ${lastSaved}` : 'No changes saved yet'}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full md:w-auto px-8 py-2 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          style={{ background: brandColors.electricBlue }}>
          {saving ? 'Saving...' : 'Save Expert Settings'}
        </button>
      </div>
    </div>
  );
}
