import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, Search, MessageSquare, Shield, Zap, Globe, BookOpen } from 'lucide-react';
import { brandColors } from '../utils/colors';
import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getCurrentUser } from '../services/authService';

interface CommunityItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  category: string;
}

/* ─── Fallback communities shown when the API hasn't loaded yet ─── */
const FALLBACK_COMMUNITIES: CommunityItem[] = [
  { id: 'sys-general', name: 'General', description: 'The global community for everyone on NextIgnition', icon: '🌐', memberCount: 0, category: 'General' },
  { id: 'sys-founder-hub', name: 'Founders Hub', description: 'Connect with fellow founders building the next big thing', icon: '🚀', memberCount: 0, category: 'Founders' },
  { id: 'sys-expert-hub', name: 'Experts Hub', description: 'Share knowledge and mentor the next generation of startups', icon: '🧠', memberCount: 0, category: 'Experts' },
  { id: 'sys-investor-hub', name: 'Investors Hub', description: 'Discover deal flow and co-invest with top investors', icon: '💎', memberCount: 0, category: 'Investors' },
];

export function CommunitySection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<CommunityItem[]>(FALLBACK_COMMUNITIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await api.get('/communities');
        const list = Array.isArray(res.data) ? res.data : [];

        const processed = list
          .filter((c: any) => {
            const visibility = String(c?.settings?.visibility || c?.visibility || 'public');
            return visibility === 'public';
          })
          .map((c: any): CommunityItem => ({
            id: String(c?._id || c?.id),
            name: String(c?.name || 'Community'),
            description: String(c?.description || 'A public community on NextIgnition'),
            icon: typeof c?.icon === 'string' && c.icon ? c.icon : '🌐',
            memberCount: typeof c?.memberCount === 'number' ? c.memberCount : 0,
            category: c?.category || 'General',
          }));

        if (!cancelled) {
          setCommunities(processed.length > 0 ? processed : FALLBACK_COMMUNITIES);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setCommunities(FALLBACK_COMMUNITIES);
          setLoading(false);
        }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  const filteredCommunities = useMemo(() => {
    return communities.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [searchQuery, communities]);

  const handleJoin = (id: string) => {
    const user = getCurrentUser();
    if (user && user.token) {
      // Logged in → go directly to the community
      window.location.hash = `#community-chat/${id}`;
    } else {
      // Not logged in → store the target community and redirect to login
      sessionStorage.setItem('redirectAfterAuth', `#community-chat/${id}`);
      window.location.hash = '#login';
    }
  };

  const benefits = [
    { title: 'Discussion Forums', desc: 'Industry specific high-signal conversations', icon: MessageSquare },
    { title: 'Expert Access', desc: 'Direct line to sector-specific veterans', icon: Shield },
    { title: 'Resource Library', desc: 'Curated guides and templates for your field', icon: BookOpen },
    { title: 'Trend Insights', desc: 'Real-time market data and shifts', icon: Zap },
    { title: 'Global Network', desc: 'Connect with peers across the globe', icon: Globe },
  ];

  /* ── Color palette for community cards ── */
  const cardColors = [
    { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', text: 'text-blue-600' },
    { bg: 'from-orange-500 to-amber-600', light: 'bg-orange-50', text: 'text-orange-600' },
    { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', text: 'text-emerald-600' },
    { bg: 'from-purple-500 to-violet-600', light: 'bg-purple-50', text: 'text-purple-600' },
    { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-50', text: 'text-rose-600' },
    { bg: 'from-cyan-500 to-sky-600', light: 'bg-cyan-50', text: 'text-cyan-600' },
  ];

  return (
    <section id="community" className="relative bg-white py-12 lg:py-24 overflow-hidden">
      {/* Background Decorative Elements — using opacity instead of blur for mobile perf */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.07]">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full" style={{ background: `radial-gradient(circle, ${brandColors.electricBlue} 0%, transparent 70%)` }}></div>
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] rounded-full" style={{ background: `radial-gradient(circle, ${brandColors.atomicOrange} 0%, transparent 70%)` }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-bold mb-6"
          >
            <Users className="w-4 h-4" />
            VIBRANT ECOSYSTEM
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight"
          >
            Join Your Industry <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Circle</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600"
          >
            Connect with high-signal founders, experts, and investors in specialized communities tailored to your sector.
          </motion.p>
        </div>

        {/* Search Bar */}
        <div className="mb-20 flex justify-center">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input name="input-cfcc09"
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Communities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 max-w-7xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredCommunities.slice(0, 3).map((community, index) => {
              const colorSet = cardColors[index % cardColors.length];
              return (
                <motion.div
                  key={community.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="group bg-white p-8 rounded-3xl border border-gray-100 hover:border-blue-500/30 hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] transition-all duration-300 flex flex-col h-full"
                >
                  {/* Icon + Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl ${colorSet.light} flex items-center justify-center text-2xl shadow-sm`}>
                      {community.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-bold uppercase tracking-wider">
                      Public
                    </span>
                  </div>

                  {/* Name & Description */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{community.name}</h3>
                  <p className="text-base text-gray-500 mb-6 line-clamp-2 flex-1">{community.description}</p>

                  {/* Member count */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex -space-x-1.5">
                      {[...Array(Math.min(3, Math.max(1, community.memberCount)))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br ${cardColors[(index + i) % cardColors.length].bg} flex items-center justify-center text-white text-[8px] font-bold`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {community.memberCount > 0 ? `${community.memberCount} members` : 'Be the first to join!'}
                    </span>
                  </div>

                  {/* Join Button */}
                  <button
                    onClick={() => handleJoin(community.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-300 shadow-lg hover:shadow-xl group-hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` }}
                  >
                    Join Now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredCommunities.length === 0 && (
          <div className="text-center py-12 mb-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔍</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No communities found</h3>
            <p className="text-sm text-gray-500">Try a different search term</p>
          </div>
        )}

        {/* Why Join Section */}
        <div className="rounded-[2.5rem] p-8 lg:p-16 text-white relative overflow-hidden" style={{ background: '#0a0c10' }}>
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grad)" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: brandColors.electricBlue, stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: brandColors.atomicOrange, stopOpacity: 1 }} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold mb-6">Built for High-Growth Ecosystems</h3>
              <p className="text-gray-400 text-lg mb-8">
                Our communities aren't just chat rooms. They are curated hubs where the next generation of industry leaders find their co-founders, investors, and strategic partners.
              </p>
              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <benefit.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">{benefit.title}</h4>
                      <p className="text-sm text-gray-400">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="h-48 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 p-6 flex flex-col justify-end">
                    <div className="text-3xl font-bold">150+</div>
                    <div className="text-sm opacity-80">Daily Discussions</div>
                  </div>
                  <div className="h-64 rounded-2xl bg-white/5 border border-white/10 p-6">
                    <div className="w-12 h-12 rounded-full bg-orange-500 mb-4 flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="text-xl font-bold mb-2">Mentorship</div>
                    <p className="text-sm text-gray-400 italic">"Found my lead investor through the FinTech Circle within 2 weeks."</p>
                  </div>
                </div>
                <div className="space-y-4 pt-8">
                  <div className="h-64 rounded-2xl bg-white/5 border border-white/10 p-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500 mb-4 flex items-center justify-center">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="text-xl font-bold mb-2">Global Access</div>
                    <p className="text-sm text-gray-400 italic">"The insights shared in the SaaS community are second to none."</p>
                  </div>
                  <div className="h-48 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-400 p-6 flex flex-col justify-end text-white">
                    <div className="text-3xl font-bold">45k+</div>
                    <div className="text-sm opacity-80">Active Members</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}