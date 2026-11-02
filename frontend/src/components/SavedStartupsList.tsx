import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, 
  MapPin, 
  Bookmark, 
  ChevronRight,
  BadgeCheck,
  Search,
  Inbox
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

interface Startup {
  id: string;
  name: string;
  tagline: string;
  industry: string[];
  stage: string;
  location: string;
  logo?: string;
  founder: {
    name: string;
    avatar: string;
    verified: boolean;
  };
}

interface SavedStartupsListProps {
  onOpenStartup?: (id: string) => void;
}

export function SavedStartupsList({ onOpenStartup }: SavedStartupsListProps = {}) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSavedStartups();
  }, []);

  const fetchSavedStartups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bookmarks/startups');
      setStartups(res.data);
    } catch (err) {
      console.error('Failed to fetch saved startups:', err);
      toast.error('Could not load saved startups');
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      const res = await api.post(`/bookmarks/startup/toggle/${id}`);
      // The toggle endpoint flips state; only drop the row if it's now unsaved.
      if (res.data?.saved === false || res.data?.saved === undefined) {
        setStartups(prev => prev.filter(s => s.id !== id));
        toast.success('Removed from saved items');
      } else {
        toast.success('Saved');
      }
    } catch (err) {
      toast.error('Failed to remove');
    }
  };

  const filteredStartups = startups.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Array.isArray(s.industry) && s.industry.some(i => i.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {startups.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search saved startups..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredStartups.length > 0 ? (
            filteredStartups.map((startup) => (
              <motion.div
                key={startup.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onOpenStartup?.(startup.id)}
                className={`group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between ${onOpenStartup ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-orange-50 p-2 flex items-center justify-center flex-shrink-0">
                    {startup.logo ? (
                      <img src={startup.logo} alt={startup.name} className="w-full h-full object-contain" />
                    ) : (
                      <Rocket className="w-8 h-8 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {startup.name}
                      <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                        {startup.stage}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-1">{startup.tagline}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {startup.location}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <div className="w-4 h-4 rounded-full overflow-hidden">
                          {startup.founder.avatar ? (
                            <img src={startup.founder.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-500">
                              {startup.founder.name?.[0] || '?'}
                            </div>
                          )}
                        </div>
                        {startup.founder.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeBookmark(startup.id); }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove from saved"
                  >
                    <Bookmark className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    onClick={() => onOpenStartup?.(startup.id)}
                    disabled={!onOpenStartup}
                    title="View startup"
                    className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-default"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Inbox className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900">
                {searchTerm ? 'No matches found' : 'No saved startups yet'}
              </h3>
              <p className="text-sm text-gray-500 max-w-[200px] mx-auto mt-1">
                {searchTerm
                  ? 'No saved startups match your search.'
                  : 'Startups you save from the Explore page will appear here.'}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
