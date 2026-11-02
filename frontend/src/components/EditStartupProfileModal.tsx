import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Camera,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  Users,
  Globe,
  Linkedin,
  Twitter,
  Sparkles,
  Edit,
  Trash2,
  Link as LinkIcon,
  Search,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  Phone,
  Briefcase,
  Award,
  UserPlus,
  AlertCircle,
  Upload,
  Github,
  ExternalLink,
  Plus
} from 'lucide-react';
import { uploadStartupLogo } from '../services/startupService';
import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';
import EmojiPicker from 'emoji-picker-react';
import {
  AddTeamMemberModal,
  EditTeamMemberModal,
  RemoveMemberModal,
  LinkProfileModal
} from './TeamManagement';

interface EditStartupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData: {
    name: string;
    tagline: string;
    logo: string;
    industry: string[];
    location: string;
    foundedDate: string;
    stage: string;
    fundingAsk: string;
    equityOffered: string;
    teamSize: number;
    website: string;
    social: {
      linkedin: string;
      twitter: string;
    };
    mission: string;
    problem: string;
    solution: string;
    businessModel: string;
    marketSize: string;
  };
}

export function EditStartupProfileModal({ isOpen, onClose, onSave, initialData }: EditStartupProfileModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [activeSection, setActiveSection] = useState<'basic' | 'details' | 'pitch' | 'team'>('basic');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAddTeamMemberModal, setShowAddTeamMemberModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([
    {
      id: 1,
      name: 'Rahul Sharma',
      email: 'rahul@techflow.ai',
      role: 'CEO & Founder',
      equity: 40,
      isLinked: true,
      username: 'rahulsharma',
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
      status: 'confirmed',
      isPrimary: true,
      bio: 'Serial entrepreneur with 10+ years in AI/ML. Previously founded and exited a B2B SaaS company.',
      linkedin: 'https://linkedin.com/in/rahulsharma',
      joinedDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Priya Shah',
      email: 'priya@techflow.ai',
      role: 'Co-founder & CTO',
      equity: 30,
      isLinked: true,
      username: 'priyashah',
      profilePicture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
      status: 'confirmed',
      isPrimary: false,
      bio: '10+ years in AI/ML, ex-Google. Built and scaled ML infrastructure for millions of users.',
      linkedin: 'https://linkedin.com/in/priyashah',
      joinedDate: '2024-01-15'
    },
    {
      id: 3,
      name: 'Arjun Patel',
      email: 'arjun@techflow.ai',
      role: 'VP Engineering',
      equity: 5,
      isLinked: false,
      username: '',
      profilePicture: '',
      status: 'pending',
      isPrimary: false,
      bio: 'Full-stack engineer with expertise in React and Node.js',
      linkedin: '',
      joinedDate: '2024-03-10'
    }
  ]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(initialData);
    setActiveSection('basic');
  }, [initialData, isOpen]);

  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [memberToLink, setMemberToLink] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleAddTeamMember = (member: Partial<any>) => {
    const newMember = {
      ...member,
      id: teamMembers.length + 1
    };
    setTeamMembers([...teamMembers, newMember]);
    setShowAddTeamMemberModal(false);
  };

  const handleEditTeamMember = (updatedMember: any) => {
    setTeamMembers(teamMembers.map(m => m.id === updatedMember.id ? updatedMember : m));
    setEditingMember(null);
  };

  const handleRemoveTeamMember = () => {
    if (memberToRemove) {
      setTeamMembers(teamMembers.filter(m => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    }
  };

  const handleLinkProfile = (platformUser: any) => {
    if (memberToLink) {
      const updated = {
        ...memberToLink,
        isLinked: true,
        username: platformUser.username,
        profilePicture: platformUser.profilePicture,
        bio: platformUser.bio
      };
      setTeamMembers(teamMembers.map(m => m.id === memberToLink.id ? updated : m));
      setMemberToLink(null);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev as any)[parent],
        [field]: value
      }
    }));
  };

  const industryOptions = [
    'AI/ML', 'B2B SaaS', 'FinTech', 'HealthTech', 'EdTech', 
    'Climate Tech', 'E-commerce', 'Consumer Goods', 'DeepTech',
    'Real Estate / PropTech', 'AgriTech', 'Web3/Crypto', 'BioTech', 'Logistics',
    'Hardware / IoT', 'Cybersecurity', 'Entertainment', 'Media', 'Food & Beverage', 'Other'
  ];
  const [customIndustry, setCustomIndustry] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const stageOptions = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="edit-startup-profile-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-50 to-blue-50 border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Startup Profile</h2>
                <p className="text-sm text-gray-600">Update your startup information</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Section Tabs */}
          <div className="border-b border-gray-200 px-6 flex gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveSection('basic')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeSection === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveSection('details')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeSection === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Funding Details
            </button>
            <button
              onClick={() => setActiveSection('pitch')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeSection === 'pitch'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Pitch Content
            </button>
            <button
              onClick={() => setActiveSection('team')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeSection === 'team'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              Team
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Basic Info Section */}
              {activeSection === 'basic' && (
                <div className="space-y-6">
                  {/* Startup Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startup Name *
                    </label>
                    <input name="input-e49785"
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your Startup Name"
                      required
                    />
                  </div>

                  {/* Logo Emoji or Image */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo (Emoji)
                      </label>
                      <div 
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent cursor-pointer flex items-center bg-white h-[60px]"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <span className="text-3xl select-none leading-none pt-[5px] inline-flex items-center justify-center">
                          {(!formData.logo || formData.logo.length <= 4) ? (formData.logo || '🚀') : '🚀'}
                        </span>
                        <span className="ml-3 text-sm text-gray-400 select-none">Choose Emoji</span>
                      </div>
                      {showEmojiPicker && (
                        <div className="absolute z-50 mt-2 shadow-2xl rounded-lg">
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(false); }} 
                          />
                          <div className="relative z-50 border border-gray-100 rounded-lg overflow-hidden bg-white">
                            <EmojiPicker 
                              lazyLoadEmojis={true}
                              onEmojiClick={(emojiData) => {
                                updateField('logo', emojiData.emoji);
                                setShowEmojiPicker(false);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo (Image Upload)
                      </label>
                      <div className="flex items-center gap-4">
                        {formData.logo && formData.logo.startsWith('http') && (
                          <img src={formData.logo} alt="Logo" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                        )}
                        <label className="flex-1 cursor-pointer">
                          <div className={`px-4 py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors ${isUploadingLogo ? 'opacity-50 pointer-events-none' : 'border-gray-300'}`}>
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-sm text-gray-600 font-medium">
                              {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                            </span>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setIsUploadingLogo(true);
                                setUploadError('');
                                const startupId = (initialData as any).id;
                                if (!startupId) throw new Error('Save your startup first to upload a logo');
                                const { logoUrl } = await uploadStartupLogo(startupId, file);
                                updateField('logo', logoUrl);
                              } catch (err: any) {
                                setUploadError(err.message || 'Failed to upload logo');
                              } finally {
                                setIsUploadingLogo(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                      {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                    </div>
                  </div>

                  {/* Tagline */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tagline *
                    </label>
                    <input name="input-caf9ff"
                      type="text"
                      value={formData.tagline}
                      onChange={(e) => updateField('tagline', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="A brief description of what you do"
                      required
                    />
                  </div>

                  {/* Industry Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry Tags (Select up to 3)
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {industryOptions.map((industry) => (
                        <button
                          key={industry}
                          type="button"
                          onClick={() => {
                            const current = formData.industry || [];
                            if (current.includes(industry)) {
                              updateField('industry', current.filter(i => i !== industry));
                            } else if (current.length < 3) {
                              updateField('industry', [...current, industry]);
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${formData.industry?.includes(industry)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {industry}
                        </button>
                      ))}
                      {/* Render custom industries that are not in the predefined list */}
                      {(formData.industry || []).filter(i => !industryOptions.includes(i) && i !== 'Other').map(customInd => (
                        <button
                          key={customInd}
                          type="button"
                          onClick={() => {
                            updateField('industry', formData.industry.filter(i => i !== customInd));
                          }}
                          className="px-3 py-2 rounded-lg text-xs font-medium transition-all bg-blue-600 text-white"
                        >
                          {customInd} ×
                        </button>
                      ))}
                    </div>
                    {formData.industry?.includes('Other') && (
                      <div className="mt-3 flex items-start gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={customIndustry}
                            onChange={(e) => setCustomIndustry(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (customIndustry.trim()) {
                                  const current = formData.industry.filter(i => i !== 'Other');
                                  if (current.length < 3) {
                                    updateField('industry', [...current, customIndustry.trim()]);
                                  }
                                  setCustomIndustry('');
                                }
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Type your industry and press Enter/Add..."
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Press Enter or click Add to save your custom industry.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (customIndustry.trim()) {
                              const current = formData.industry.filter(i => i !== 'Other');
                              if (current.length < 3) {
                                updateField('industry', [...current, customIndustry.trim()]);
                              } else {
                                alert("You can only select up to 3 industries.");
                              }
                              setCustomIndustry('');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Location *
                    </label>
                    <input name="input-c5f2b6"
                      type="text"
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="City, Country"
                      required
                    />
                  </div>

                  {/* Founded Date & Team Size */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Founded Date *
                      </label>
                      <input name="input-674235"
                        type="text"
                        value={formData.foundedDate}
                        onChange={(e) => updateField('foundedDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Jan 2023"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Team Size *
                      </label>
                      <input name="input-8611d0"
                        type="text"
                        value={formatWithCommas(String(formData.teamSize))}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d+$/.test(val)) updateField('teamSize', parseInt(val) || 0);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12"
                        required
                      />
                    </div>
                  </div>

                  {/* Website & Social */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Website
                    </label>
                    <input name="input-2ef8eb"
                      type="text"
                      value={formData.website}
                      onChange={(e) => updateField('website', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="yourcompany.com"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Linkedin className="w-4 h-4 inline mr-1" />
                        LinkedIn
                      </label>
                      <input name="input-0222ee"
                        type="text"
                        value={formData.social.linkedin}
                        onChange={(e) => updateNestedField('social', 'linkedin', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="company-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Twitter className="w-4 h-4 inline mr-1" />
                        Twitter
                      </label>
                      <input name="input-f3cc8c"
                        type="text"
                        value={formData.social.twitter}
                        onChange={(e) => updateNestedField('social', 'twitter', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="@yourcompany"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Funding Details Section */}
              {activeSection === 'details' && (
                <div className="space-y-6">
                  {/* Stage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Startup Stage *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {stageOptions.map((stage) => (
                        <button
                          key={stage}
                          type="button"
                          onClick={() => updateField('stage', stage)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.stage === stage
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Funding Ask & Equity */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Funding Ask *
                      </label>
                      <input name="input-c7e24d"
                        type="text"
                        value={formData.fundingAsk}
                        onChange={(e) => updateField('fundingAsk', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="$2M"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Equity Offered *
                      </label>
                      <input name="input-7de28f"
                        type="text"
                        value={formData.equityOffered}
                        onChange={(e) => updateField('equityOffered', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="10%"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pitch Content Section */}
              {activeSection === 'pitch' && (
                <div className="space-y-6">
                  {/* Mission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mission Statement *
                    </label>
                    <textarea name="textarea-9a8a4f"
                      value={formData.mission}
                      onChange={(e) => updateField('mission', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="What is your startup's mission?"
                      required
                    />
                  </div>

                  {/* Problem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Problem Statement *
                    </label>
                    <textarea name="textarea-7ac0eb"
                      value={formData.problem}
                      onChange={(e) => updateField('problem', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="What problem are you solving?"
                      required
                    />
                  </div>

                  {/* Solution */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Solution *
                    </label>
                    <textarea name="textarea-2e4014"
                      value={formData.solution}
                      onChange={(e) => updateField('solution', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="How does your product/service solve the problem?"
                      required
                    />
                  </div>

                  {/* Business Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Model *
                    </label>
                    <textarea name="textarea-9e0312"
                      value={formData.businessModel}
                      onChange={(e) => updateField('businessModel', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="How do you make money?"
                      required
                    />
                  </div>

                  {/* Market Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Market Size & Opportunity *
                    </label>
                    <textarea name="textarea-9652e3"
                      value={formData.marketSize}
                      onChange={(e) => updateField('marketSize', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="What is the market size and growth potential?"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Team Section */}
              {activeSection === 'team' && (
                <div className="space-y-6">
                  {/* Section Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Team Members</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Add your co-founders and key team members. Link their NextIgnition profiles to showcase your team.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddTeamMemberModal(true)}
                      className="px-4 py-2 text-sm rounded-lg font-bold text-white transition-all hover:shadow-lg flex items-center gap-2 whitespace-nowrap"
                      style={{ backgroundColor: brandColors.electricBlue }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Member
                    </button>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-3">
                    {teamMembers.map(member => (
                      <div
                        key={member.id}
                        className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Profile Picture */}
                          <div className="relative flex-shrink-0">
                            {member.profilePicture ? (
                              <img
                                src={member.profilePicture}
                                alt={member.name}
                                className="w-20 h-20 rounded-full border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-2xl border-2 border-gray-200">
                                {member.name.split(' ').map((n: string) => n[0]).join('')}
                              </div>
                            )}
                            {member.isLinked && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Member Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-gray-900">
                                    {member.isLinked ? (
                                      <button className="hover:text-blue-600 transition-colors">
                                        {member.name}
                                      </button>
                                    ) : (
                                      member.name
                                    )}
                                  </h4>

                                  {/* Platform Status Badge */}
                                  {member.isLinked ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                      <Check className="w-3 h-3" />
                                      On NextIgnition
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                      Not on platform
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  {member.status === 'pending' && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      Pending
                                    </span>
                                  )}
                                  {member.status === 'confirmed' && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Confirmed
                                    </span>
                                  )}
                                  {member.status === 'declined' && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Declined
                                    </span>
                                  )}

                                  {member.isPrimary && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                      Primary
                                    </span>
                                  )}
                                </div>

                                {/* Username */}
                                {member.isLinked && member.username && (
                                  <p className="text-sm text-blue-600 font-medium">@{member.username}</p>
                                )}
                              </div>
                            </div>

                            {/* Role & Equity */}
                            <div className="flex items-center gap-4 text-sm text-gray-700 mb-2">
                              <div className="flex items-center gap-1">
                                <Briefcase className="w-4 h-4 text-gray-400" />
                                <span>{member.role}</span>
                              </div>
                              {member.equity && (
                                <div className="flex items-center gap-1">
                                  <Award className="w-4 h-4 text-gray-400" />
                                  <span>{member.equity}% Equity</span>
                                </div>
                              )}
                            </div>

                            {/* Email */}
                            <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{member.email}</span>
                            </div>

                            {/* Bio */}
                            {member.bio && (
                              <p className="text-sm text-gray-700 line-clamp-2 mb-2">{member.bio}</p>
                            )}

                            {/* Social Links */}
                            {member.isLinked && (member.linkedin || member.twitter || member.github) && (
                              <div className="flex items-center gap-2 mb-3">
                                {member.linkedin && (
                                  <a
                                    href={member.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    <Linkedin className="w-4 h-4 text-gray-600" />
                                  </a>
                                )}
                                {member.twitter && (
                                  <a
                                    href={member.twitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    <Twitter className="w-4 h-4 text-gray-600" />
                                  </a>
                                )}
                                {member.github && (
                                  <a
                                    href={member.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    <Github className="w-4 h-4 text-gray-600" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setEditingMember(member)}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit
                              </button>

                              {!member.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => setMemberToRemove(member)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove
                                </button>
                              )}

                              {!member.isLinked && !member.isPrimary && (
                                <button
                                  type="button"
                                  onClick={() => setMemberToLink(member)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  Link Profile
                                </button>
                              )}

                              {member.isLinked && member.username && (
                                <button
                                  type="button"
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View Profile
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      {/* Team Management Modals */}
      <AddTeamMemberModal
        key="add-team-member-modal"
        isOpen={showAddTeamMemberModal}
        onClose={() => setShowAddTeamMemberModal(false)}
        onAdd={handleAddTeamMember}
      />

      <EditTeamMemberModal
        key="edit-team-member-modal"
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onSave={handleEditTeamMember}
      />

      <RemoveMemberModal
        key="remove-team-member-modal"
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        member={memberToRemove}
        onConfirm={handleRemoveTeamMember}
      />

      <LinkProfileModal
        key="link-profile-modal"
        isOpen={!!memberToLink}
        onClose={() => setMemberToLink(null)}
        member={memberToLink}
        onLink={handleLinkProfile}
      />
    </AnimatePresence>
  );
}