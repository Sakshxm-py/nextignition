import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { brandColors } from '../utils/colors';

export interface StoryData {
  id: number;
  author: string;
  authorId?: string;
  avatar: string;
  image: string;
  timestamp: string;
  viewed: boolean;
  content?: string;
  mediaType?: 'image' | 'video';
}

interface StoryViewerProps {
  stories: StoryData[];
  initialIndex: number;
  onClose: () => void;
  onStoryChange?: (index: number) => void;
  /** Called when the viewer sends a reply to a story. Receives the story and the reply text. */
  onReply?: (story: StoryData, text: string) => void | Promise<void>;
}

export function StoryViewer({ stories, initialIndex, onClose, onStoryChange, onReply }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sentReplies, setSentReplies] = useState<{ storyId: number; text: string }[]>([]);
  const [replySent, setReplySent] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story
  const minSwipeDistance = 50;

  useEffect(() => {
    if (onStoryChange) {
      onStoryChange(currentIndex);
    }
  }, [currentIndex, onStoryChange]);

  useEffect(() => {
    if (!isPaused) {
      setProgress(0);
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            goToNext();
            return 0;
          }
          return prev + (100 / (STORY_DURATION / 100));
        });
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused]);

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  const goToNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  const handleReply = () => {
    const text = replyText.trim();
    if (!text) return;

    // Prefer a parent-provided handler (e.g. wired to the messaging API) when present.
    if (onReply) {
      Promise.resolve(onReply(currentStory, text)).catch(() => {
        /* parent handles its own error surface; reply already shown as sent locally */
      });
    }

    // Always record the reply locally so the user gets visible confirmation.
    setSentReplies((prev) => [...prev, { storyId: currentStory.id, text }]);
    setReplyText('');
    setReplySent(true);
    setTimeout(() => setReplySent(false), 2000);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setShowLikeAnimation(true);
    setTimeout(() => {
      setShowLikeAnimation(false);
    }, 500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Story Container */}
        <div
          className="relative w-full h-full max-w-[500px] max-h-screen lg:max-h-[90vh] lg:h-auto lg:aspect-[9/16] bg-black"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: '0%' }}
                  animate={{
                    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 pt-6 z-20">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${currentStory.avatar.includes('http') || currentStory.avatar.includes('/') ? 'bg-transparent overflow-hidden' : 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-full flex items-center justify-center text-white font-bold border-2 border-white`}>
                {(currentStory.avatar.includes('http') || currentStory.avatar.includes('/')) ? (
                  <img src={currentStory.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  currentStory.avatar
                )}
              </div>
              <div>
                <div className="text-white font-bold text-sm">{currentStory.author}</div>
                <div className="text-white/80 text-xs">{currentStory.timestamp}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                {isPaused ? (
                  <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
                ) : (
                  <div className="flex gap-1">
                    <div className="w-1 h-3 bg-white rounded-full" />
                    <div className="w-1 h-3 bg-white rounded-full" />
                  </div>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Story Image/Content */}
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
            {currentStory.image ? (
              currentStory.mediaType === 'video' ? (
                <video
                  src={currentStory.image}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted={false} // Maybe add a mute button later
                  playsInline
                />
              ) : (
                <img
                  src={currentStory.image}
                  alt={`Story by ${currentStory.author}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className={`w-24 h-24 ${currentStory.avatar.includes('http') || currentStory.avatar.includes('/') ? 'bg-transparent overflow-hidden' : 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4`}>
                    {(currentStory.avatar.includes('http') || currentStory.avatar.includes('/')) ? (
                      <img src={currentStory.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentStory.avatar
                    )}
                  </div>
                  <p className="text-white text-xl font-bold mb-2">{currentStory.author}</p>
                  {currentStory.content && (
                    <p className="text-white/90 text-lg">{currentStory.content}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons - Desktop & Mobile */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-10">
            {/* Previous Button */}
            {currentIndex > 0 && (
              <button
                onClick={goToPrevious}
                className="pointer-events-auto w-16 h-16 ml-4 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-all backdrop-blur-sm"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
            )}

            {/* Spacer for centering */}
            <div className="flex-1" />

            {/* Next Button */}
            {currentIndex < stories.length - 1 && (
              <button
                onClick={goToNext}
                className="pointer-events-auto w-16 h-16 mr-4 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 transition-all backdrop-blur-sm"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            )}
          </div>

          {/* Story Content Overlay */}
          {currentStory.content && currentStory.image && (
            <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end pb-24 px-6">
              <p className="text-white text-lg leading-relaxed font-medium drop-shadow-lg">{currentStory.content}</p>
            </div>
          )}

          {/* Reply Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-20">
            {/* Replies already sent for this story */}
            {sentReplies.filter((r) => r.storyId === currentStory.id).length > 0 && (
              <div className="mb-2 flex flex-col items-end gap-1.5">
                {sentReplies
                  .filter((r) => r.storyId === currentStory.id)
                  .map((r, i) => (
                    <div
                      key={i}
                      className="max-w-[80%] px-3 py-1.5 rounded-2xl rounded-br-sm bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm break-words"
                    >
                      {r.text}
                    </div>
                  ))}
              </div>
            )}
            <AnimatePresence>
              {replySent && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-medium"
                >
                  <Send className="w-3.5 h-3.5" />
                  Reply sent
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input name="input-e4bcf4"
                  type="text"
                  placeholder={`Reply to ${currentStory.author}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md text-white placeholder-white/60 rounded-full border border-white/20 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              <motion.button
                onClick={handleReply}
                disabled={!replyText.trim()}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5 text-white" />
              </motion.button>
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all relative"
              >
                <motion.div
                  animate={{
                    scale: isLiked ? [1, 1.3, 1] : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart 
                    className={`w-5 h-5 transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`}
                  />
                </motion.div>
                {showLikeAnimation && (
                  <motion.div
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                  </motion.div>
                )}
              </motion.button>
            </div>
          </div>

          {/* Tap Zones for Quick Navigation (Mobile) */}
          <div className="absolute inset-0 flex pointer-events-none z-[5]">
            {/* Left tap zone */}
            <div
              className="flex-1 pointer-events-auto mt-[0px] mr-[0px] mb-[86px] ml-[0px]"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            />
            {/* Right tap zone */}
            <div
              className="flex-1 pointer-events-auto mt-[0px] mr-[0px] mb-[86px] ml-[0px]"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}