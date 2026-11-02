import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Search, BadgeCheck, Bookmark } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { getUsersByRole } from '../services/userService';
import { toggleProfileBookmark, getSavedProfiles } from '../services/bookmarkService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { toast } from 'sonner';

interface InvestorUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
  roles?: string[];
  location?: string;
  bio?: string;
  isVerified?: boolean;
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function getInitials(name?: string) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const second = (parts.length > 1 ? parts[1]?.[0] : parts[0]?.[1]) || '';
  return `${first}${second}`.toUpperCase();
}

interface DiscoverInvestorsProps {
  onMessage?: (userId: string) => void;
  excludeUserId?: string;
}

export function DiscoverInvestors({ onMessage, excludeUserId }: DiscoverInvestorsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [investors, setInvestors] = useState<InvestorUser[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { hasFeature, userPlan } = useFeatureAccess();

  useEffect(() => {
    let cancelled = false;

    const fetchInvestors = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getUsersByRole('investor', excludeUserId);
        const list = Array.isArray(data) ? data : [];

        const mapped: InvestorUser[] = list.map((u: any, idx: number) => {
          const id = String(u._id || u.id || u.email || `${u.name || 'investor'}-${idx}`);
          return {
            id,
            name: u.name || u.fullName || 'Investor',
            email: u.email,
            avatar: u.avatar,
            title: u.title || u.headline || 'Investor',
            roles: u.roles ? u.roles.map((r: any) => r.type || r) : undefined,
            location: u.location,
            bio: u.bio || u.about,
            isVerified: !!u.isVerified,
          };
        });

        if (!cancelled) setInvestors(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setInvestors([]);
          setError(e?.response?.data?.message || 'Failed to load investors');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchInvestors();

    const fetchSaved = async () => {
      try {
        const saved = await getSavedProfiles();
        setSavedIds(saved.map(p => p.id));
      } catch (err) {
        console.error('Failed to fetch saved investors:', err);
      }
    };
    fetchSaved();

    return () => {
      cancelled = true;
    };
  }, [excludeUserId]);

  const handleToggleSave = async (id: string) => {
    // Optimistic update
    setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    
    try {
      const result = await toggleProfileBookmark(id, 'investor');
      toast.success(result.saved ? 'Investor saved' : 'Removed from saved');
    } catch (err) {
      console.error('Failed to toggle save:', err);
      toast.error('Failed to update bookmark');
      // Revert
      setSavedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter((i) => {
      const hay = `${i.name} ${i.title || ''} ${i.location || ''} ${i.bio || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [investors, searchTerm]);

  return (
    <div className="px-4 lg:px-6 pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Discover Investors</h2>
          <p className="text-gray-600">Connect with investors who can fund and accelerate your startup</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input name="input-a41ece"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search investors by name, firm, location, focus..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              style={{ outlineColor: brandColors.electricBlue }}
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-10 text-gray-500">Loading investors...</div>
        )}

        {!loading && error && (
          <div className="text-center py-10 text-red-600 font-semibold">{error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-bold">{filtered.length}</span> investors found
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((inv, idx) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.02 }}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {isHttpUrl(inv.avatar || '') ? (
                      <>
                        <img
                          src={inv.avatar}
                          alt={inv.name}
                          className="w-12 h-12 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.classList.remove('hidden');
                              e.currentTarget.nextElementSibling.classList.add('flex');
                            }
                          }}
                        />
                        <div
                          className="w-12 h-12 rounded-full hidden items-center justify-center font-bold text-white"
                          style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})` }}
                        >
                          {getInitials(inv.name)}
                        </div>
                      </>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${brandColors.atomicOrange}, ${brandColors.electricBlue})` }}
                      >
                        {getInitials(inv.name)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 truncate">{inv.name}</h3>
                        {inv.isVerified && (
                          <BadgeCheck className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      {inv.roles && inv.roles.length > 1 ? (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {inv.roles.map((role) => (
                            <span
                              key={role}
                              className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold capitalize"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 truncate">{inv.title || 'Investor'}</p>
                      )}
                      {inv.location && <p className="text-xs text-gray-500 truncate">{inv.location}</p>}
                    </div>
                  </div>

                  {inv.bio && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-3">{inv.bio}</p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        if (!hasFeature('canDirectMessage')) {
                          toast.error(Capacitor.getPlatform() === 'ios' ? 'Direct messaging is available with NextIgnition Premium.' : `Your current ${userPlan} plan does not allow initiating direct messages. Please upgrade to Pro.`, {
                            action: { label: 'Upgrade', onClick: () => window.location.hash = '#pricing' }
                          });
                          return;
                        }
                        onMessage?.(inv.id);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold transition-all active:scale-95"
                      style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                    <button 
                      onClick={() => handleToggleSave(inv.id)}
                      className={`p-3 border rounded-xl transition-all active:scale-95 ${
                        savedIds.includes(inv.id) 
                          ? 'bg-blue-50 border-blue-200 text-blue-600' 
                          : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                      }`}
                      title={savedIds.includes(inv.id) ? "Unsave" : "Save"}
                    >
                      <Bookmark className={`w-5 h-5 ${savedIds.includes(inv.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-10 text-gray-500">No investors match your search.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
