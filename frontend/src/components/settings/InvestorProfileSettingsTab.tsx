import { TrendingUp, DollarSign, Target, Briefcase, Plus, X, CheckCircle, Camera, Upload, AlertTriangle } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { useEffect, useRef, useState } from 'react';
import { getCurrentUser } from '../../services/authService';
import { getProfile, uploadAvatar, uploadCoverPhoto, updateProfile } from '../../services/userService';
import { formatWithCommas, parseNumericValue } from '../../utils/formatters';

export function InvestorProfileSettingsTab({ userRole }: any) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');

  // Form State
  const [investorType, setInvestorType] = useState('Individual Angel Investor');
  const [firmName, setFirmName] = useState('');
  const [minTicket, setMinTicket] = useState<string>('0');
  const [maxTicket, setMaxTicket] = useState<string>('0');
  const [typicalCheck, setTypicalCheck] = useState<string>('0');
  const [stages, setStages] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [newIndustry, setNewIndustry] = useState('');
  const [geographicFocus, setGeographicFocus] = useState<string[]>([]);
  const [thesis, setThesis] = useState('');
  const [tractionRequirement, setTractionRequirement] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<string[]>(['Pitch Deck']);
  const [dealbreakers, setDealbreakers] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const cacheBust = (url: string) => {
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  };

  useEffect(() => {
    const load = async () => {
      const user = getCurrentUser();
      setCurrentUser(user);
      const userId = user?.id || user?._id;
      if (!userId) return;
      try {
        setLoading(true);
        const profile = await getProfile(userId);
        const p = profile.profile || {};

        setAvatarUrl(cacheBust(profile.avatar || user.avatar || ''));
        setCoverPhotoUrl(cacheBust(profile.coverPhoto || user.coverPhoto || ''));

        // Load investor specific data
        setInvestorType(p.investorType || 'Individual Angel Investor');
        setFirmName(p.firmName || '');
        setMinTicket(String(p.minTicket || 0));
        setMaxTicket(String(p.maxTicket || 0));
        setTypicalCheck(String(p.typicalCheck || 0));
        setStages(p.preferredStages || []);
        setIndustries(p.industries || []);
        setGeographicFocus(p.geographicFocus || []);
        setThesis(p.thesis || '');
        setTractionRequirement(p.tractionRequirement || '');
        setRequiredDocs(p.requiredDocs || ['Pitch Deck']);
        setDealbreakers(p.dealbreakers || '');

        if (profile.updatedAt) {
          setLastSaved(new Date(profile.updatedAt).toLocaleTimeString());
        }
      } catch (e) {
        console.error('Failed to load investor profile', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvatarPick = () => avatarInputRef.current?.click();
  const handleCoverPick = () => coverInputRef.current?.click();

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAvatarUploading(true);
      const res = await uploadAvatar(file);
      setAvatarUrl(cacheBust(res.avatar));
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, avatar: res.avatar }));
      }
      setMessage('Profile photo updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to upload photo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCoverUploading(true);
      const res = await uploadCoverPhoto(file);
      setCoverPhotoUrl(cacheBust(res.coverPhoto));
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, coverPhoto: res.coverPhoto }));
      }
      setMessage('Cover photo updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to upload cover photo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const investorData = {
        investorType,
        firmName,
        minTicket: Number(minTicket),
        maxTicket: Number(maxTicket),
        typicalCheck: Number(typicalCheck),
        preferredStages: stages,
        industries,
        geographicFocus,
        thesis,
        tractionRequirement,
        requiredDocs,
        dealbreakers
      };

      await updateProfile(investorData);

      setLastSaved(new Date().toLocaleTimeString());
      setMessage('Investor settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Save failed', error);
      setMessage('Failed to save investment settings.');
    } finally {
      setSaving(false);
    }
  };

  const addIndustry = () => {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry]);
      setNewIndustry('');
    }
  };

  const toggleDoc = (doc: string) => {
    if (requiredDocs.includes(doc)) {
      setRequiredDocs(requiredDocs.filter(d => d !== doc));
    } else {
      setRequiredDocs([...requiredDocs, doc]);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading investor profile...</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Investment Profile Settings</h1>
        <p className="text-gray-600">Manage your investment preferences and portfolio</p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium">
          {message}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Profile Photos</h2>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Cover Photo</label>
          <input name="input-f548be"
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          <div
            onClick={handleCoverPick}
            className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl overflow-hidden group cursor-pointer"
            style={coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">{isCoverUploading ? 'Uploading...' : 'Change Cover'}</p>
                <p className="text-xs text-white/80 mt-1">Recommended: 1200×300px</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-6">
          <div
            onClick={handleAvatarPick}
            className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 text-3xl font-bold cursor-pointer border-4 border-white shadow-sm hover:border-blue-100 transition-all">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              'I'
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-bold mb-2">Profile Picture</h3>
            <p className="text-sm text-gray-600 mb-3">Max 5MB (JPG, PNG, WEBP)</p>
            <input name="input-9d6fe3"
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <button
              onClick={handleAvatarPick}
              disabled={isAvatarUploading}
              className="px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-60 flex items-center gap-2"
              style={{ background: brandColors.electricBlue }}
            >
              <Upload className="w-4 h-4" />
              {isAvatarUploading ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 1: Investor Information */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Investor Information</h2>

        <div className="space-y-4">
          {/* Investor Type */}
          <div>
            <label className="block text-sm font-medium mb-3">Investor Type</label>
            <div className="space-y-2">
              {[
                'Individual Angel Investor',
                'Venture Capital Fund',
                'Corporate VC',
                'Family Office',
                'Syndicate Lead'
              ].map((type) => (
                <label key={type} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="investorType"
                    checked={investorType === type}
                    onChange={() => setInvestorType(type)}
                    style={{ accentColor: brandColors.electricBlue }}
                  />
                  <span className="font-medium text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* VC Firm Name */}
          <div>
            <label className="block text-sm font-medium mb-2">VC Firm Name (if applicable)</label>
            <input name="input-deba61"
              type="text"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Enter firm name..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Verification Status */}
          {loading ? null : (
            <div className={`p-4 rounded-lg border ${
              (currentUser?.profile?.isVerified || false) 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {(currentUser?.profile?.isVerified || false) ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-700">Verified Investor ✓</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-bold text-yellow-700">Verification Pending</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">
                {(currentUser?.profile?.isVerified || false) 
                  ? 'Your investor status has been verified for all premium dealflow.' 
                  : 'Complete your profile and link your LinkedIn to get verified for premium dealflow.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Investment Focus */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Investment Focus</h2>

        <div className="space-y-4">
          {/* Ticket Size */}
          <div>
            <label className="block text-sm font-medium mb-3">Ticket Size (Local Currency)</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Minimum</label>
                <input name="input-27cdfd"
                  type="text"
                  value={formatWithCommas(minTicket)}
                  onChange={(e) => {
                    const val = parseNumericValue(e.target.value);
                    if (val === '' || /^\d+$/.test(val)) setMinTicket(val);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Maximum</label>
                <input name="input-10970f"
                  type="text"
                  value={formatWithCommas(maxTicket)}
                  onChange={(e) => {
                    const val = parseNumericValue(e.target.value);
                    if (val === '' || /^\d+$/.test(val)) setMaxTicket(val);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Typical Check</label>
                <input name="input-366421"
                  type="text"
                  value={formatWithCommas(typicalCheck)}
                  onChange={(e) => {
                    const val = parseNumericValue(e.target.value);
                    if (val === '' || /^\d+$/.test(val)) setTypicalCheck(val);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Preferred Stages */}
          <div>
            <label className="block text-sm font-medium mb-2">Preferred Stages</label>
            <div className="flex flex-wrap gap-2">
              {['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth Stage'].map((stage) => (
                <button
                  key={stage}
                  onClick={() => {
                    if (stages.includes(stage)) {
                      setStages(stages.filter(s => s !== stage));
                    } else {
                      setStages([...stages, stage]);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${stages.includes(stage)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  style={stages.includes(stage) ? { background: brandColors.electricBlue } : {}}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          {/* Industry Preferences */}
          <div>
            <label className="block text-sm font-medium mb-2">Industry Preferences</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {industries.map((industry) => (
                <span key={industry} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ background: brandColors.electricBlue }}>
                  {industry}
                  <button onClick={() => setIndustries(industries.filter(i => i !== industry))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input name="input-144131"
                type="text"
                placeholder="Add industry (e.g. Fintech, Edtech)"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIndustry()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addIndustry}
                className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                style={{ background: brandColors.electricBlue }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Geographic Focus */}
          <div>
            <label className="block text-sm font-medium mb-2">Geographic Focus</label>
            <div className="flex flex-wrap gap-2">
              {['Global', 'India', 'Southeast Asia', 'US', 'Europe', 'MENA'].map((geo) => (
                <button
                  key={geo}
                  onClick={() => {
                    if (geographicFocus.includes(geo)) {
                      setGeographicFocus(geographicFocus.filter(g => g !== geo));
                    } else {
                      setGeographicFocus([...geographicFocus, geo]);
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${geographicFocus.includes(geo)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  style={geographicFocus.includes(geo) ? { background: brandColors.electricBlue } : {}}
                >
                  {geo}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Thesis */}
          <div>
            <label className="block text-sm font-medium mb-2">Investment Thesis</label>
            <textarea name="textarea-d2dd52"
              rows={6}
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="Describe your investment philosophy and what you look for in startups... (e.g. Focus on AI-first B2B SaaS in emerging markets)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Deal Preferences */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Deal Preferences</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Traction Required</label>
            <input name="input-623a45"
              type="text"
              value={tractionRequirement}
              onChange={(e) => setTractionRequirement(e.target.value)}
              placeholder="e.g., MVP launched with 10 pilot customers"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Required Documents</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Pitch Deck', 'Business Plan', 'Financial Projections', 'Cap Table', 'Technical Roadmap'].map((doc) => (
                <label key={doc} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input name="input-828ef5"
                    type="checkbox"
                    checked={requiredDocs.includes(doc)}
                    onChange={() => toggleDoc(doc)}
                    style={{ accentColor: brandColors.electricBlue }}
                  />
                  <span className="font-medium text-sm">{doc}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Red Flags / Dealbreakers</label>
            <textarea name="textarea-30ee28"
              rows={3}
              value={dealbreakers}
              onChange={(e) => setDealbreakers(e.target.value)}
              placeholder="List any blockers (e.g. No single founder teams, high burns without revenue)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white rounded-xl p-6 shadow-sm relative md:sticky md:bottom-4 z-40 border border-gray-200">
        <div className="text-sm text-gray-500">
          {lastSaved ? `Last saved at ${lastSaved}` : 'No changes saved yet'}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isAvatarUploading || isCoverUploading}
          className="px-8 py-2 rounded-lg font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          style={{ background: brandColors.electricBlue }}>
          {saving ? 'Saving...' : 'Save Investment Settings'}
        </button>
      </div>
    </div>
  );
}
