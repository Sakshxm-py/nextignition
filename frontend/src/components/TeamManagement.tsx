import { useState, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Users,
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
  Edit,
  Trash2,
  Link as LinkIcon,
  Linkedin,
  Twitter,
  Github,
  Sparkles,
  ExternalLink,
  Send,
  User
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  equity?: number;
  isLinked: boolean;
  username?: string;
  profilePicture?: string;
  status: 'pending' | 'confirmed' | 'declined';
  isPrimary: boolean;
  bio?: string;
  linkedin?: string;
  twitter?: string;
  github?: string;
  phone?: string;
  joinedDate: string;
}

interface PlatformUser {
  id: number;
  name: string;
  username: string;
  email: string;
  profilePicture: string;
  role: 'Founder' | 'Expert' | 'Investor';
  bio: string;
  credentials?: string[];
  location?: string;
}

// Mock Platform Users for Search
const mockPlatformUsers: PlatformUser[] = [];

// Add Team Member Modal
export function AddTeamMemberModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: Partial<TeamMember>) => void;
}) {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    customRole: '',
    equity: '',
    phone: '',
    linkedin: '',
    bio: '',
    sendInvite: true,
    profilePicture: ''
  });

  const roleOptions = [
    'Co-founder',
    'CTO',
    'CMO',
    'CFO',
    'COO',
    'VP Engineering',
    'VP Marketing',
    'VP Sales',
    'Head of Product',
    'Other'
  ];

  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: URL.createObjectURL(file) }));
    }
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
  };

  const filteredUsers = mockPlatformUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFromPlatform = () => {
    if (!selectedUser) return;

    onAdd({
      name: selectedUser.name,
      email: selectedUser.email,
      role: formData.role,
      equity: formData.equity ? parseFloat(formData.equity) : undefined,
      isLinked: true,
      username: selectedUser.username,
      profilePicture: selectedUser.profilePicture,
      status: 'pending',
      isPrimary: false,
      bio: selectedUser.bio,
      joinedDate: new Date().toISOString()
    });

    onClose();
  };

  const handleAddManually = () => {
    onAdd({
      name: formData.name,
      email: formData.email,
      role: formData.role === 'Other' ? formData.customRole : formData.role,
      equity: formData.equity ? parseFloat(formData.equity) : undefined,
      isLinked: false,
      username: '',
      profilePicture: formData.profilePicture,
      status: 'pending',
      isPrimary: false,
      bio: formData.bio,
      linkedin: formData.linkedin,
      phone: formData.phone,
      joinedDate: new Date().toISOString()
    });

    onClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add Team Member</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Search platform users or add manually
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'search'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Search Platform Users
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${activeTab === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Add Manually
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'search' ? (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="input-ebc710"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or @username..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Search Results */}
                <div className="space-y-3">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedUser?.id === user.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={user.profilePicture}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                            const fallback = document.createElement('div');
                            fallback.className = 'w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold';
                            fallback.innerText = initials;
                            e.currentTarget.parentElement?.appendChild(fallback);
                          }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900">{user.name}</h3>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                          <p className="text-sm text-gray-700 mt-1">{user.bio}</p>
                          {user.credentials && user.credentials.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.credentials.map(cred => (
                                <span
                                  key={cred}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  {cred}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedUser?.id === user.id && (
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Role & Equity Selection (if user selected) */}
                {selectedUser && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
                    <h4 className="font-bold text-gray-900">Add Details</h4>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role *
                      </label>
                      <select name="select-44d2e3"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select role...</option>
                        {roleOptions.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>

                    {formData.role === 'Other' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Custom Role *
                        </label>
                        <input name="input-adc00e"
                          type="text"
                          value={formData.customRole}
                          onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                          placeholder="Enter custom role"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Equity % (Optional)
                      </label>
                      <input name="input-d5f127"
                        type="text"
                        value={formatWithCommas(formData.equity)}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d*\.?\d*$/.test(val)) setFormData({ ...formData, equity: val });
                        }}
                        placeholder="e.g., 25"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">For internal tracking</p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="input-6d82e7"
                        type="checkbox"
                        checked={formData.sendInvite}
                        onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Send invitation notification
                      </span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Manual Add Form */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input name="input-e01ff3"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input name="input-741780"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select name="select-eadcc1"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select role...</option>
                      {roleOptions.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {formData.role === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Role *
                      </label>
                      <input name="input-7e6677"
                        type="text"
                        value={formData.customRole}
                        onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                        placeholder="Enter custom role"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Equity % (Optional)
                    </label>
                    <input name="input-99318d"
                      type="text"
                      value={formatWithCommas(formData.equity)}
                      onChange={(e) => {
                        const val = parseNumericValue(e.target.value);
                        if (val === '' || /^\d*\.?\d*$/.test(val)) setFormData({ ...formData, equity: val });
                      }}
                      placeholder="e.g., 25"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone (Optional)
                    </label>
                    <input name="input-bcb41d"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn (Optional)
                    </label>
                    <input name="input-f92503"
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="https://linkedin.com/in/johndoe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio / Description (Optional)
                  </label>
                  <textarea name="textarea-659be8"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Brief description of their background..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.bio.length}/200 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xl overflow-hidden">
                      {formData.profilePicture ? (
                        <img
                          src={formData.profilePicture}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : formData.name ? (
                        getInitials(formData.name)
                      ) : (
                        <User className="w-8 h-8" />
                      )}
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Photo
                    </button>
                    {formData.profilePicture && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
                        className="text-sm text-gray-600 hover:text-red-600 font-medium transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input name="input-8aa6d7"
                    type="checkbox"
                    checked={formData.sendInvite}
                    onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Invite them to join NextIgnition
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={activeTab === 'search' ? handleAddFromPlatform : handleAddManually}
              disabled={
                activeTab === 'search'
                  ? !selectedUser || !formData.role
                  : !formData.name || !formData.email || !formData.role || (formData.role === 'Other' && !formData.customRole)
              }
              className="px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: brandColors.electricBlue }}
            >
              <UserPlus className="w-5 h-5" />
              Add Team Member
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Edit Team Member Modal
export function EditTeamMemberModal({
  isOpen,
  onClose,
  member,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onSave: (updatedMember: TeamMember) => void;
}) {
  const [formData, setFormData] = useState<Partial<TeamMember>>(member || {});

  const roleOptions = [
    'Co-founder',
    'CTO',
    'CMO',
    'CFO',
    'COO',
    'VP Engineering',
    'VP Marketing',
    'VP Sales',
    'Head of Product',
    'Other'
  ];

  const handleSave = () => {
    if (member) {
      onSave({ ...member, ...formData });
      onClose();
    }
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Team Member</h2>
                <p className="text-sm text-gray-600 mt-1">Update member information</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name {member.isLinked && <span className="text-gray-500 text-xs">(From platform)</span>}
                  </label>
                  <input name="input-f48bb3"
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={member.isLinked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email {member.isLinked && <span className="text-gray-500 text-xs">(From platform)</span>}
                  </label>
                  <input name="input-3ed8f4"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={member.isLinked}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select name="select-d6fcfc"
                    value={formData.role || ''}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {roleOptions.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Equity %
                  </label>
                  <input name="input-1dfedc"
                    type="text"
                    value={formatWithCommas(String(formData.equity || ''))}
                    onChange={(e) => {
                      const val = parseNumericValue(e.target.value);
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setFormData({ ...formData, equity: parseFloat(val) || 0 });
                    }}
                    placeholder="e.g., 25"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {!member.isLinked && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio / Description
                  </label>
                  <textarea name="textarea-8d4936"
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 rounded-lg font-bold text-white transition-all"
              style={{ backgroundColor: brandColors.electricBlue }}
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Remove Member Confirmation Modal
export function RemoveMemberModal({
  isOpen,
  onClose,
  member,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onConfirm: () => void;
}) {
  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Remove Team Member?</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            Are you sure you want to remove <strong>{member.name}</strong> from your team?
            {member.isLinked && ' They will be notified about this change.'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Link Profile Modal
export function LinkProfileModal({
  isOpen,
  onClose,
  member,
  onLink
}: {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  onLink: (platformUser: PlatformUser) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  // Find suggestions based on email/name match
  const suggestions = member ? mockPlatformUsers.filter(user =>
    user.email.toLowerCase() === member.email.toLowerCase() ||
    user.name.toLowerCase() === member.name.toLowerCase()
  ) : [];

  const filteredUsers = mockPlatformUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLink = () => {
    if (selectedUser) {
      onLink(selectedUser);
      onClose();
    }
  };

  if (!isOpen || !member) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Link to Platform User</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Connect {member.name} to their NextIgnition account
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {/* Suggested Matches */}
              {suggestions.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    Suggested Matches
                  </h3>
                  <div className="space-y-2">
                    {suggestions.map(user => (
                      <div
                        key={user.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedUser?.id === user.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900">{user.name}</h4>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Match
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">@{user.username} • {user.email}</p>
                            <p className="text-sm text-gray-700 mt-1">{user.bio}</p>
                          </div>
                          {selectedUser?.id === user.id && (
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Search All Users</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="input-506fb8"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or @username..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {searchQuery && (
                  <div className="mt-3 space-y-2">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedUser?.id === user.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={user.profilePicture}
                            alt={user.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{user.name}</h4>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                            <p className="text-sm text-gray-700 mt-1">{user.bio}</p>
                          </div>
                          {selectedUser?.id === user.id && (
                            <CheckCircle className="w-6 h-6 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedUser}
              className="px-6 py-3 rounded-lg font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: brandColors.electricBlue }}
            >
              <LinkIcon className="w-5 h-5" />
              Link Profiles
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
