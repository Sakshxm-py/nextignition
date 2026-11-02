import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Lightbulb, DollarSign, Briefcase, Clock, Award } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { formatWithCommas, parseNumericValue } from '../utils/formatters';
import api from '../services/api';
import { toast } from 'sonner';

interface ProfileCreationModalProps {
  isOpen: boolean;
  profileType: 'expert' | 'investor';
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProfileCreationModal({ isOpen, profileType, onClose, onSuccess }: ProfileCreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [expertise, setExpertise] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [investmentStage, setInvestmentStage] = useState('seed');
  const [minInvestment, setMinInvestment] = useState<string>('0');
  const [newExpertise, setNewExpertise] = useState('');

  const handleAddExpertise = () => {
    if (newExpertise.trim()) {
      setExpertise([...expertise, newExpertise.trim()]);
      setNewExpertise('');
    }
  };

  const handleRemoveExpertise = (item: string) => {
    setExpertise(expertise.filter(e => e !== item));
  };

  const handleCreateExpertProfile = async () => {
    try {
      setLoading(true);
      // Extract numeric value from experience string, fallback to 0
      const numericExperience = parseInt(experience.replace(/\D/g, ''), 10) || 0;
      
      await api.put('/cofounders/me', {
        currentRole: 'expert',
        lookingFor: expertise.join(', '), // Schema has lookingFor as String
        commitment: 'Flexible', // Must match backend enum: 'Full-time' | 'Part-time' | 'Flexible'
        equityExpectation: '0', // Schema has equityExpectation as String
        hourlyRate: Number(hourlyRate),
        yearsExperience: numericExperience,
        previousStartups: 0, // Schema has previousStartups as Number
        availability: 'available',
        vision: '',
        strengths: expertise,
        interests: expertise,
        skills: expertise,
        location: '',
        startupStatus: 'wants-to-join', // Must match backend enum: 'has-startup' | 'wants-to-join' | 'ideal'
        isActive: true,
      });
      toast.success('Expert profile created successfully! 🎉');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create expert profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestorProfile = async () => {
    try {
      setLoading(true);
      await api.post('/funding/create-investor-profile', {
        investmentStage,
        minInvestment: Number(minInvestment),
      });
      toast.success('Investor profile created successfully! 🎉');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create investor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (profileType === 'expert') {
      await handleCreateExpertProfile();
    } else {
      await handleCreateInvestorProfile();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {profileType === 'expert' ? (
                  <>
                    <div className="p-2 rounded-lg" style={{ background: brandColors.atomicOrange + '20' }}>
                      <Lightbulb className="w-6 h-6" style={{ color: brandColors.atomicOrange }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Create Expert Profile</h2>
                      <p className="text-sm text-gray-600">Share your expertise and mentor startups</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-lg" style={{ background: brandColors.navyBlue + '20' }}>
                      <DollarSign className="w-6 h-6" style={{ color: brandColors.navyBlue }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Create Investor Profile</h2>
                      <p className="text-sm text-gray-600">Discover investment opportunities</p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-6">
              {profileType === 'expert' ? (
                <>
                  {/* Expertise */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Areas of Expertise</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {expertise.map((item) => (
                        <motion.div
                          key={item}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                          style={{ background: brandColors.electricBlue }}
                        >
                          {item}
                          <button
                            onClick={() => handleRemoveExpertise(item)}
                            className="hover:bg-white/20 rounded p-0.5 transition"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Add New Area</label>
                    <div className="flex gap-2">
                      <input name="input-95142e"
                        type="text"
                        value={newExpertise}
                        onChange={(e) => setNewExpertise(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddExpertise()}
                        placeholder="e.g., Product Management, AI/ML, SaaS"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleAddExpertise}
                        className="px-4 py-2 rounded-lg font-medium text-white transition"
                        style={{ background: brandColors.atomicOrange }}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Years of Experience */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Years of Experience
                    </label>
                    <input name="input-4b5e24"
                      type="text"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder="e.g., 10+ years in startup ecosystem"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Hourly Rate */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Hourly Rate (optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">$</span>
                      <input name="input-ab8a27"
                        type="text"
                        value={formatWithCommas(hourlyRate)}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d+$/.test(val)) setHourlyRate(val);
                        }}
                        placeholder="0"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-gray-700 font-medium">/hour</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Investment Stage */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Investment Focus</label>
                    <select name="select-a089a9"
                      value={investmentStage}
                      onChange={(e) => setInvestmentStage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="seed">Seed Stage</option>
                      <option value="seriesA">Series A</option>
                      <option value="seriesB">Series B</option>
                      <option value="seriesC">Series C+</option>
                      <option value="growth">Growth Stage</option>
                      <option value="any">Any Stage</option>
                    </select>
                  </div>

                  {/* Minimum Investment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Minimum Investment Amount
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700 font-medium">$</span>
                      <input name="input-0ccf1b"
                        type="text"
                        value={formatWithCommas(minInvestment)}
                        onChange={(e) => {
                          const val = parseNumericValue(e.target.value);
                          if (val === '' || /^\d+$/.test(val)) setMinInvestment(val);
                        }}
                        placeholder="0"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-gray-700 font-medium">K</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 rounded-lg font-medium text-white transition disabled:opacity-50"
                style={{ background: profileType === 'expert' ? brandColors.atomicOrange : brandColors.navyBlue }}
              >
                {loading ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
