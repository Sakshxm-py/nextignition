import { useEffect, useState } from 'react';
import { Upload, Trash2, Plus, X, Eye, ChevronDown, ChevronUp, FileText, Video, Download, Send, Lightbulb, Wrench, TrendingUp, Rocket } from 'lucide-react';
import { createStartup, getMyStartups, updateStartup } from '../../services/startupService';
import { formatWithCommas, parseNumericValue } from '../../utils/formatters';
import { brandColors } from '../../utils/colors';
import { Capacitor } from '@capacitor/core';

export function StartupSettingsTab({ userRole }: any) {
  const [startupId, setStartupId] = useState<string | null>(null);
  const [startupName, setStartupName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState('');
  const [headquarters, setHeadquarters] = useState('');
  const [foundedMonth, setFoundedMonth] = useState('');
  const [foundedYear, setFoundedYear] = useState(new Date().getFullYear().toString());
  const [currentStage, setCurrentStage] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [fundingStatus, setFundingStatus] = useState('');
  const [fundingAmount, setFundingAmount] = useState<string>('0');
  const [equityOffered, setEquityOffered] = useState<number>(0);
  const [useOfFunds, setUseOfFunds] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [pitchDeckName, setPitchDeckName] = useState('');
  const [pitchDeckSize, setPitchDeckSize] = useState(0);
  const [logoUrl, setLogoUrl] = useState('');

  const [fundingExpanded, setFundingExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingDeck, setIsUploadingDeck] = useState(false);
  const [message, setMessage] = useState('');
  const [logoError, setLogoError] = useState(false);

  const industries = ['SaaS', 'FinTech', 'HealthTech', 'EdTech', 'E-commerce', 'AI/ML', 'Blockchain', 'CleanTech'];
  const tags = ['B2B', 'B2C', 'Enterprise', 'Consumer', 'Mobile', 'Web', 'Hardware'];

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');

  useEffect(() => {
    const fetchStartup = async () => {
      try {
        const startups = await getMyStartups();
        if (startups && startups.length > 0) {
          const startup = startups[0];
          setStartupId(startup.id || startup._id);
          setStartupName(startup.name || '');
          setTagline(startup.tagline || '');
          setDescription(startup.description || '');

          if (startup.industry) {
            setSelectedIndustries(Array.isArray(startup.industry) ? startup.industry : [startup.industry]);
          }

          if (startup.tags) {
            setSelectedTags(startup.tags);
          }

          setCompanySize(startup.teamSize?.toString() || '1-5');
          setHeadquarters(startup.location || '');

          if (startup.foundedDate) {
            const date = new Date(startup.foundedDate);
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            setFoundedMonth(months[date.getMonth()]);
            setFoundedYear(date.getFullYear().toString());
          }

          setCurrentStage(startup.stage || 'idea');
          setLookingFor(startup.lookingFor || []);
          setFundingStatus(startup.fundingStatus || 'Bootstrapped');
          setFundingAmount(String(startup.funding?.target || 0));
          setEquityOffered(startup.funding?.equity || 0);
          setUseOfFunds(startup.useOfFunds || '');
          setPitchDeckUrl(startup.pitchDeckUrl || '');
          setPitchDeckName(startup.pitchDeckName || '');
          setPitchDeckSize(startup.pitchDeckSize || 0);
          setLogoUrl(startup.logo || '');
          setTeamMembers(startup.teamMembers || []);
          setPendingInvites(startup.pendingInvites || []);
        }
      } catch (error) {
        console.error("Failed to load startup", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStartup();
  }, []);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [deckFile, setDeckFile] = useState<File | null>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!startupId) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      return;
    }

    try {
      setIsUploadingLogo(true);
      const { uploadStartupLogo } = await import('../../services/startupService');
      const result = await uploadStartupLogo(startupId, file);
      setLogoUrl(result.logoUrl);
      setLogoError(false);
      setMessage('Logo uploaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to upload logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!startupId) {
      setDeckFile(file);
      setPitchDeckName(file.name);
      setPitchDeckSize(file.size);
      setPitchDeckUrl('pending'); // Marker for pending upload
      return;
    }

    try {
      setIsUploadingDeck(true);
      const { uploadStartupPitchDeck } = await import('../../services/startupService');
      const result = await uploadStartupPitchDeck(startupId, file);
      setPitchDeckUrl(result.pitchDeckUrl);
      setPitchDeckName(file.name);
      setPitchDeckSize(file.size);
      setMessage('Pitch deck uploaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to upload pitch deck.');
    } finally {
      setIsUploadingDeck(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const monthMap: Record<string, number> = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };

      const payload = {
        name: startupName,
        tagline,
        description,
        industry: selectedIndustries,
        tags: selectedTags,
        teamSize: parseInt(companySize) || 1,
        location: headquarters,
        foundedDate: new Date(parseInt(foundedYear), monthMap[foundedMonth] || 0).toISOString(),
        stage: currentStage,
        lookingFor,
        fundingStatus,
        funding: {
          target: Number(fundingAmount),
          equity: equityOffered,
          currency: 'INR'
        },
        useOfFunds,
        pitchDeckUrl,
        pitchDeckName,
        pitchDeckSize,
        logo: logoUrl,
        teamMembers,
        pendingInvites
      };

      let currentId = startupId;
      if (currentId) {
        await updateStartup(currentId, payload);
      } else {
        const newStartup = await createStartup({
          ...payload,
          description: description || "My Startup Description",
        });
        currentId = newStartup.id || newStartup._id;
        setStartupId(currentId);
      }

      // Handle pending uploads if startup was just created
      if (currentId) {
        if (logoFile) {
          try {
            const { uploadStartupLogo } = await import('../../services/startupService');
            const result = await uploadStartupLogo(currentId, logoFile);
            setLogoUrl(result.logoUrl);
            setLogoError(false);
            setLogoFile(null);
          } catch (err) {
            console.error("Failed to upload pending logo", err);
          }
        }
        if (deckFile) {
          try {
            const { uploadStartupPitchDeck } = await import('../../services/startupService');
            const result = await uploadStartupPitchDeck(currentId, deckFile);
            setPitchDeckUrl(result.pitchDeckUrl);
            setDeckFile(null);
          } catch (err) {
            console.error("Failed to upload pending deck", err);
          }
        }
      }

      setMessage('Startup settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save startup settings.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Startup Settings</h1>
        <p className="text-gray-600">Manage your startup information and team</p>
        {message && <p className={`mt-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </div>

      {/* Section 1: Company Information */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Company Information</h2>

        <div className="space-y-4">
          {/* Startup Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Startup Name <span className="text-red-500">*</span>
            </label>
            <input name="input-236a61"
              type="text"
              value={startupName}
              onChange={(e) => setStartupName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Company Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Company Logo</label>
            <div className="flex items-start gap-4">
              <div
                className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-2xl font-bold cursor-pointer group relative overflow-hidden border-2 border-dashed border-gray-300"
                onClick={() => document.getElementById('logo-upload')?.click()}
              >
                {(logoUrl || logoPreview) && !logoError ? (
                  <img
                    src={logoUrl || logoPreview}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  startupName ? startupName.substring(0, 2).toUpperCase() : 'TF'
                )}
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">Upload a square logo (200×200px recommended)</p>
                <button
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={isUploadingLogo}
                  className="px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-50"
                  style={{ background: brandColors.electricBlue }}>
                  <Upload className="w-4 h-4 inline mr-2" />
                  {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                </button>
              </div>
            </div>
          </div>

          {/* Tagline/Mission */}
          <div>
            <label className="block text-sm font-medium mb-2">Tagline/Mission Statement</label>
            <textarea name="textarea-20d59b"
              rows={2}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short tagline for your startup"
              maxLength={200}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{tagline.length}/200 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Full Description</label>
            <textarea name="textarea-f24214"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us more about your startup, the problem you're solving, and your solution."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2">Industry (Multi-select)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {industries.map((industry) => (
                <button
                  key={industry}
                  onClick={() => {
                    if (selectedIndustries.includes(industry)) {
                      setSelectedIndustries(selectedIndustries.filter(i => i !== industry));
                    } else {
                      setSelectedIndustries([...selectedIndustries, industry]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedIndustries.includes(industry)
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  style={selectedIndustries.includes(industry) ? {
                    background: brandColors.electricBlue
                  } : {}}
                >
                  {industry}
                  {selectedIndustries.includes(industry) && (
                    <X className="w-3 h-3 inline ml-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">Sector Tags (up to 5)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTags.map((tag) => (
                <span key={tag} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                  style={{ background: brandColors.atomicOrange }}>
                  {tag}
                  <button onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.filter(t => !selectedTags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (selectedTags.length < 5) {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  disabled={selectedTags.length >= 5}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Company Size & HQ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Company Size</label>
              <select name="select-c167f0"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1-5">1-5</option>
                <option value="6-10">6-10</option>
                <option value="11-50">11-50</option>
                <option value="50-200">50-200</option>
                <option value="200+">200+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Headquarters</label>
              <input name="input-e197a5"
                type="text"
                value={headquarters}
                onChange={(e) => setHeadquarters(e.target.value)}
                placeholder="City, Country"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Founded Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Founded Month</label>
              <select name="select-1510c7"
                value={foundedMonth}
                onChange={(e) => setFoundedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Founded Year</label>
              <select name="select-9c905a"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Startup Status */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Startup Status</h2>

        {/* Current Stage */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Current Stage</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'idea', label: 'Idea Stage', icon: Lightbulb },
              { value: 'mvp', label: 'MVP Development', icon: Wrench },
              { value: 'growth', label: 'Growth Stage', icon: TrendingUp },
              { value: 'scaling', label: 'Scaling', icon: Rocket },
            ].map((stage) => (
              <button
                key={stage.value}
                onClick={() => setCurrentStage(stage.value)}
                className={`p-4 border-2 rounded-xl text-left transition-all ${currentStage === stage.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <stage.icon className="w-6 h-6 mb-2" style={currentStage === stage.value ? { color: brandColors.electricBlue } : {}} />
                <p className="font-bold text-sm">{stage.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Looking For */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Looking For (Multi-select)</label>
          <div className="space-y-2">
            {[
              { value: 'funding', label: '💰 Funding' },
              { value: 'cofounder', label: '🤝 Co-founder' },
              { value: 'mentor', label: '👨‍🏫 Mentor/Expert' },
              { value: 'team', label: '👥 Team Members' },
              { value: 'all', label: '🌐 All of the Above' },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input name="input-9aa62f"
                  type="checkbox"
                  checked={lookingFor.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLookingFor([...lookingFor, option.value]);
                    } else {
                      setLookingFor(lookingFor.filter(v => v !== option.value));
                    }
                  }}
                  className="w-4 h-4"
                  style={{ accentColor: brandColors.electricBlue }}
                />
                <span className="font-medium">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Funding Status */}
        <div>
          <label className="block text-sm font-medium mb-2">Funding Status</label>
          <select name="select-e79790"
            value={fundingStatus}
            onChange={(e) => setFundingStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Bootstrapped">Bootstrapped</option>
            <option value="Pre-seed">Pre-seed</option>
            <option value="Seed">Seed</option>
            <option value="Series A">Series A</option>
            <option value="Series B">Series B</option>
            <option value="Not Fundraising">Not Fundraising</option>
          </select>
        </div>
      </div>

      {/* Section 3: Funding Requirements */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <button
          onClick={() => setFundingExpanded(!fundingExpanded)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h2 className="text-xl font-bold">Funding Requirements</h2>
          {fundingExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {fundingExpanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Funding Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Funding Amount Required</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input name="input-7ed6ee"
                    type="text"
                    value={formatWithCommas(fundingAmount)}
                    onChange={(e) => {
                      const val = parseNumericValue(e.target.value);
                      if (val === '' || /^\d+$/.test(val)) setFundingAmount(val);
                    }}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Equity Offered (%)</label>
                <input name="input-7ed5d0"
                  type="range"
                  min="0"
                  max="50"
                  value={equityOffered}
                  onChange={(e) => setEquityOffered(parseInt(e.target.value) || 0)}
                  className="w-full"
                  style={{ accentColor: brandColors.electricBlue }}
                />
                <p className="text-center text-sm font-bold mt-1" style={{ color: brandColors.electricBlue }}>{equityOffered}%</p>
              </div>
            </div>

            {/* Use of Funds */}
            <div>
              <label className="block text-sm font-medium mb-2">Use of Funds</label>
              <textarea name="textarea-defb87"
                rows={4}
                value={useOfFunds}
                onChange={(e) => setUseOfFunds(e.target.value)}
                placeholder="Breakdown of how funds will be used..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Pitch Deck */}
            <div>
              <label className="block text-sm font-medium mb-2">Pitch Deck</label>
              <div className="border border-gray-200 rounded-lg p-4">
                {pitchDeckUrl ? (
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-red-500" />
                      <div>
                        <p className="font-medium">{pitchDeckName || 'pitch_deck.pdf'}</p>
                        <p className="text-xs text-gray-500">
                          {pitchDeckSize ? `${(pitchDeckSize / (1024 * 1024)).toFixed(1)} MB` : ''}
                        </p>
                      </div>
                    </div>
                    <a
                      href={pitchDeckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Download className="w-5 h-5 text-gray-600" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm italic">
                    No pitch deck uploaded yet
                  </div>
                )}
                <input
                  type="file"
                  id="deck-upload"
                  className="hidden"
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                  onChange={handleDeckUpload}
                />
                <button
                  onClick={() => document.getElementById('deck-upload')?.click()}
                  disabled={isUploadingDeck}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  {isUploadingDeck ? 'Uploading...' : pitchDeckUrl ? 'Replace Deck' : 'Upload Pitch Deck'}
                </button>
              </div>
            </div>

            {/* Pitch Video */}
            <div>
              <label className="block text-sm font-medium mb-2">Pitch Video (2-minute max)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                <Video className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-3">No pitch video uploaded</p>
                <button className="px-6 py-2 rounded-lg font-medium text-white"
                  style={{ background: brandColors.electricBlue }}>
                  <Video className="w-4 h-4 inline mr-2" />
                  Record New Pitch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Team Management */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm relative">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Team Management</h2>
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-lg font-medium text-white text-sm"
            style={{ background: brandColors.electricBlue }}>
            <Plus className="w-4 h-4 inline mr-2" />
            Invite Team Member
          </button>
        </div>

        {showInviteModal && (
          <div className="absolute top-16 right-6 bg-white border border-gray-200 shadow-xl rounded-xl p-4 w-80 z-10 transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900">Send Invitation</h3>
              <button type="button" onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input name="input-9faf04" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@startup.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Role Title</label>
                <input name="input-c704a4" type="text" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} placeholder="e.g. CTO, Developer" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (inviteEmail && inviteRole) {
                    setPendingInvites([...pendingInvites, { email: inviteEmail, role: inviteRole, sentDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }]);
                    setInviteEmail('');
                    setInviteRole('');
                    setShowInviteModal(false);
                  }
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mt-2 transition-colors">
                Send Invite
              </button>
            </div>
          </div>
        )}

        {/* Team Members Table */}
        <div className="space-y-3 mb-6">
          {teamMembers.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm italic">No team members added yet. Invite your colleagues!</div>
          ) : teamMembers.map((member, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {member.photo || member.name?.substring(0, 2).toUpperCase() || 'TM'}
                </div>
                <div>
                  <p className="font-bold text-sm">{member.name}</p>
                  <p className="text-xs text-gray-600">{member.role} • {member.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                  Edit Role
                </button>
                <button
                  type="button"
                  onClick={() => setTeamMembers(teamMembers.filter((_, i) => i !== index))}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Invitations */}
        {pendingInvites.length > 0 && (
          <>
            <h3 className="font-bold mb-3">Pending Invitations</h3>
            <div className="space-y-2">
              {pendingInvites.map((invite, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{invite.email}</p>
                    <p className="text-xs text-gray-600">{invite.role} • Sent {invite.sentDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Send className="w-3 h-3 inline mr-1" />
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingInvites(pendingInvites.filter((_, i) => i !== index))}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Section 5: Company Visibility */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Company Visibility</h2>

        <div className="space-y-4">
          {/* Profile Visibility */}
          <div>
            <label className="block text-sm font-medium mb-3">Profile Visibility</label>
            <div className="space-y-2">
              {[
                { value: 'public', label: '🌐 Public', desc: 'Visible to all' },
                { value: 'connections', label: '🔗 Connections Only', desc: 'Only your connections' },
                { value: 'private', label: '🔒 Private', desc: 'Only visible to you' },
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    defaultChecked={option.value === 'public'}
                    className="mt-1"
                    style={{ accentColor: brandColors.electricBlue }}
                  />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-xs text-gray-600">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Searchable in Funding Portal */}
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <p className="font-medium">Searchable in Funding Portal</p>
              <p className="text-sm text-gray-600">Your startup appears in investor searches</p>
            </div>
            <label className="relative inline-block w-12 h-6">
              <input name="input-e4286b" type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-12 h-6 bg-gray-300 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 transition-colors"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
            </label>
          </div>

          {/* Featured Listing — paid upsell hidden on iOS (Apple Guideline 3.1.1: no price/purchase CTA) */}
          {Capacitor.getPlatform() !== 'ios' && (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">Featured Listing Status</p>
                  <p className="text-sm text-gray-600">Current: Basic Listing</p>
                </div>
                <button className="px-4 py-2 rounded-lg font-bold text-white text-sm"
                  style={{ background: brandColors.atomicOrange }}>
                  Upgrade to Featured - ₹2,999
                </button>
              </div>
              <p className="text-xs text-gray-500">Featured listings appear at the top of search results and get 5x more visibility</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white rounded-xl p-6 shadow-sm">
        <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Preview Public Profile
        </button>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg font-bold text-white disabled:opacity-50"
            style={{ background: brandColors.electricBlue }}>
            {isLoading ? 'Saving...' : 'Save Startup Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}