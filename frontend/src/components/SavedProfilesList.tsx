import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bookmark, 
  MapPin, 
  MessageCircle, 
  Share2, 
  BadgeCheck, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { brandColors } from '../utils/colors';
import { getSavedProfiles, toggleProfileBookmark, BookmarkedProfile } from '../services/bookmarkService';
import { Avatar } from './common/Avatar';

interface SavedProfilesListProps {
  onMessage?: (userId: string) => void;
}

export function SavedProfilesList({ onMessage }: SavedProfilesListProps = {}) {
  const [profiles, setProfiles] = useState<BookmarkedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const data = await getSavedProfiles();
      setProfiles(data);
      setError(null);
    } catch (err: any) {
      setError('Failed to load saved profiles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      // Optimistic update
      const removedProfile = profiles.find(p => p.id === id);
      setProfiles(prev => prev.filter(p => p.id !== id));
      
      const result = await toggleProfileBookmark(id);
      if (result.saved) {
        // Should not happen if we are removing, but for safety:
        if (removedProfile && !profiles.some(p => p.id === id)) {
          setProfiles(prev => [...prev, removedProfile]);
        }
      }
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      fetchSaved(); // Rollback
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Loading your saved profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchSaved}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bookmark className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No saved profiles yet</h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Profiles you save from the Discover page will appear here for quick access.
        </p>
        <button 
          onClick={() => window.location.hash = '#investor-dashboard'} // Default to a dashboard with discover
          className="text-blue-600 font-bold hover:underline"
        >
          Go to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {profiles.map((profile) => (
          <motion.div
            key={profile.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all flex flex-col"
          >
            <div className="p-5 flex-1">
              <div className="flex items-start gap-4 mb-4">
                <Avatar 
                  src={profile.avatar} 
                  name={profile.name} 
                  size="xl" 
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="font-bold text-gray-900 truncate">{profile.name}</h4>
                    {profile.isVerified && (
                      <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-1">
                    {profile.role}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{profile.location || profile.profile?.location || 'Location N/A'}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                {profile.bio || profile.profile?.bio || 'No bio available.'}
              </p>

              {profile.startupName && (
                <div className="bg-blue-50 rounded-lg p-2 flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-white rounded border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {profile.startupName.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Current Startup</p>
                    <p className="text-xs font-bold text-gray-900 truncate">{profile.startupName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-50 bg-gray-50/50 p-3 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                <button 
                  onClick={() => window.location.hash = `#profile/${profile.role}/${profile.id}`}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                  title="View Profile"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (onMessage) {
                      onMessage(profile.id);
                    } else {
                      window.location.hash = `#messages/${profile.id}`;
                    }
                  }}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-gray-600"
                  title="Message"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => handleRemove(profile.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
