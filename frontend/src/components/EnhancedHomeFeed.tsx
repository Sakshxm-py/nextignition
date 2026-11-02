import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { brandColors } from '../utils/colors';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Avatar } from './common/Avatar';
import { VerificationBanner } from './VerificationBanner';
import { StoryViewer, StoryData } from './StoryViewer';
import { sendMessage } from '../services/messageService';
import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../services/api';
import { getCurrentUser } from '../services/authService';
import { getSocket } from '../services/socketService';
import {
  Plus,
  Users,
  Search,
  TrendingUp,
  Bookmark,
  Filter,
  ChevronRight,
  Calendar,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Sparkles,
  BadgeCheck,
  Trophy,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  Smile,
  Send,
  ImageIcon as ImageIcon,
  Video,
  FileText,
  BarChart3,
  MapPin,
  Link as LinkIcon,
  UserPlus,
  Edit,
  Trash2,
  Flag,
  EyeOff,
  Copy,
  Ban,
  VolumeOff,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { CreateEventModal } from './CreateEventModal';
import { ReportDialog } from './ReportDialog';
import { enhancePostContent } from '../services/aiService';
import { rankFeed } from '../utils/feedRanking';
import { SharePostModal } from './SharePostModal';
import { useImpressionTracker } from '../hooks/useImpressionTracker';

interface Story {
  id: number;
  author: string;
  avatar: string;
  image: string;
  timestamp: string;
  viewed: boolean;
}

interface Post {
  id: string;
  apiId?: string;
  author: {
    name: string;
    avatar: string;
    title: string;
    verified: boolean;
    _id: string;
  };
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'poll' | 'milestone' | 'document' | 'event';
  content: string;
  images?: string[];
  video?: {
    url: string;
    thumbnail?: string;
    duration?: string;
  };
  poll?: {
    question: string;
    options: { text: string; votes: number; percentage: number }[];
    totalVotes: number;
    userVoted: number | null;
  };
  milestone?: {
    title: string;
    description: string;
    icon: typeof Trophy;
    color: string;
  };
  document?: {
    title: string;
    type: string;
    size: string;
  };
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  /** Epoch millis of creation — reliable basis for ranking/sorting. */
  createdAtMs: number;
  apiComments?: {
    user: {
      name: string;
      avatar?: string;
    };
    text: string;
    createdAt: string;
  }[];
}

interface EnhancedHomeFeedProps {
  userType?: 'founder' | 'investor' | 'expert' | 'cofounder';
  initialFilter?: string;
  openCreateModal?: boolean;
  onCreateModalClose?: () => void;
}

interface ApiFeedPost {
  _id?: string;
  id?: string;
  author?: {
    _id: string;
    id?: string;
    name: string;
    role?: string;
    avatar?: string;
  };
  content: string;
  type?: 'text' | 'image' | 'video' | 'poll' | 'milestone' | 'document' | 'event';
  image?: string;
  images?: string[];
  video?: { url: string; thumbnail?: string; duration?: string };
  poll?: any;
  milestone?: any;
  document?: any;
  createdAt: string;
  likes?: string[];
  comments?: {
    user: {
      _id: string;
      id?: string;
      name: string;
      avatar?: string
    };
    text: string;
    createdAt: string
  }[];
}

export function EnhancedHomeFeed({ userType = 'founder', initialFilter, openCreateModal, onCreateModalClose }: EnhancedHomeFeedProps) {
  const [activeFilter, setActiveFilter] = useState(initialFilter || 'Following');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState<Post['type']>('text');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  // Images of the specific post whose image was tapped (so the lightbox shows the
  // RIGHT post's image, not the first post that happens to have images).
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postFile, setPostFile] = useState<File | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneType, setMilestoneType] = useState('');
  const [aiEnhancedVersions, setAiEnhancedVersions] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [isVerified, setIsVerified] = useState(false); // Always show banner by default
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);
  const [mutedVideo, setMutedVideo] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const [openPostMenu, setOpenPostMenu] = useState<string | null>(null);
  const [reportPost, setReportPost] = useState<{ id: string; author: string } | null>(null);
  const postMenuRef = useRef<HTMLDivElement | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [creatingStory, setCreatingStory] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCommentEmojiPicker, setActiveCommentEmojiPicker] = useState<string | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const commentEmojiPickerRef = useRef<HTMLDivElement>(null);

  // Close emoji pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (activeCommentEmojiPicker && commentEmojiPickerRef.current && !commentEmojiPickerRef.current.contains(target)) {
        setActiveCommentEmojiPicker(null);
      }
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [activeCommentEmojiPicker, showEmojiPicker]);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);


  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserId: string | null = currentUser?.id || currentUser?._id || null;
  const currentUserName: string = currentUser?.name || 'You';
  const currentUserInitials: string = (currentUserName || 'You')
    .split(' ')
    .filter(Boolean)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const mapApiPostToUi = (p: ApiFeedPost): Post => {
    const created = new Date(p.createdAt);
    const timestamp = created.toLocaleString();
    const postId = p.id || p._id || '';
    const likesArr = p.likes || [];
    const isLiked = currentUserId ? likesArr.includes(currentUserId) : false;

    return {
      id: postId,
      apiId: postId,
      author: {
        name: p.author?.name || 'User',
        avatar: p.author?.avatar || (p.author?.name ? p.author.name.charAt(0).toUpperCase() : 'U'),
        title: p.author?.role || 'Member',
        verified: !!(p.author as any)?.isVerified,
        _id: p.author?.id || p.author?._id || ''
      },
      timestamp,
      type: p.type || 'text',
      content: p.content || '',
      images: p.images || (p.image ? [p.image] : undefined),
      video: p.video ? { url: p.video.url, thumbnail: p.video.thumbnail ?? '', duration: p.video.duration ?? '' } : undefined,
      poll: p.poll,
      milestone: p.milestone,
      document: p.document,
      likes: likesArr.length,
      comments: (p.comments || []).length,
      shares: 0,
      isLiked,
      isBookmarked: (p as any).isBookmarked || false,
      createdAtMs: created.getTime() || 0,
      apiComments: p.comments?.map(c => ({
        user: {
          name: c.user?.name || 'Unknown',
          avatar: c.user?.avatar
        },
        text: c.text,
        createdAt: c.createdAt
      }))
    };
  };

  const feedFilters = ['Following', 'Discover', 'Trending', 'Saved'];

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [stories, setStories] = useState<StoryData[]>([
    {
      id: 1,
      author: currentUserName,
      avatar: currentUserInitials,
      image: '',
      timestamp: '',
      viewed: false,
      content: 'Add your story',
    },
  ]);

  const fetchStories = async () => {
    try {
      const resp = await api.get('/feed/stories');
      const apiStories = resp.data || [];
      const mappedStories: StoryData[] = apiStories.map((s: any) => {
        const authorName = s.author?.name || 'User';
        const avatarStr = s.author?.avatar || authorName.charAt(0).toUpperCase();
        return {
          id: s.id,
          author: authorName,
          authorId: s.author?.id ? String(s.author.id) : undefined,
          avatar: avatarStr,
          image: s.image || '',
          timestamp: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          viewed: false,
          content: s.content || '',
          mediaType: s.mediaType,
        };
      });

      setStories(prev => {
        const addStoryNode = prev.find(st => st.id === 1);
        return addStoryNode ? [addStoryNode, ...mappedStories] : mappedStories;
      });
    } catch(err) {
      console.error('Failed to fetch stories', err);
    }
  };

  const handleCreateStory = async () => {
    if (!storyContent.trim() && !storyFile) return;
    setCreatingStory(true);
    try {
      const formData = new FormData();
      formData.append('content', storyContent.trim());
      if (storyFile) {
        formData.append('media', storyFile);
      }

      await api.post('/feed/stories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchStories();
      setStoryContent('');
      setStoryFile(null);
      setShowCreateStoryModal(false);
    } catch(e) {
      console.error('Failed to create story', e);
    } finally {
      setCreatingStory(false);
    }
  };

  const trendingTopics: { tag: string; posts: number; trend: string }[] = [];

  const suggestedConnections: { name: string; title: string; mutual: string; avatar: string }[] = [];

  const [posts, setPosts] = useState<Post[]>([]);
  // Records post impressions (engagement) as posts scroll into view.
  const trackImpression = useImpressionTracker();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string>('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [createPostError, setCreatePostError] = useState<string>('');
  // Post currently open in the in-app "Share to chat" sheet (Messages + Communities).
  const [sharePostTarget, setSharePostTarget] = useState<Post | null>(null);

  // Order/filter the feed for the active tab using the Instagram/YouTube-style
  // ranking engine (Following / Trending / Discover relevance / Saved).
  const rankedPosts = useMemo(
    () =>
      rankFeed(posts, activeFilter, {
        followingIds,
        currentUserId,
        currentUserRole: currentUser?.role ?? null,
      }),
    [posts, activeFilter, followingIds, currentUserId, currentUser]
  );

  useEffect(() => {
    if (openCreateModal) {
      setShowCreateModal(true);
      setCreatePostError('');
      // Immediately reset the flag so the modal doesn't reopen on re-renders
      onCreateModalClose?.();
    }
  }, [openCreateModal]);

  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const resp = await api.get(activeFilter === 'Saved' ? '/feed/saved' : '/feed');

      const apiPosts = resp.data as ApiFeedPost[];
      const uniqueApiPosts = apiPosts.filter((p, i, self) =>
        self.findIndex(x => x._id === p._id) === i
      );
      const mapped = uniqueApiPosts.map(mapApiPostToUi);

      setPosts(mapped);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch feed';
      setFeedError(msg);
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (mounted) setCurrentUser(user);
      } catch {
        // ignore
      }
      try {
        const resp = await api.get<{ followingUserIds: string[] }>('/follow/following');
        if (mounted) setFollowingIds(new Set(resp.data?.followingUserIds || []));
      } catch {
        // ignore — feed still works, just without follow prioritization
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchFeed();
    if (activeFilter !== 'Saved') fetchStories();
  }, [currentUserId, activeFilter]);

  useEffect(() => {
    // Use the shared singleton socket — NOT a new io() call.
    // Independent io() calls were the root cause of the WebSocket flood errors.
    const socket = getSocket();

    const onFeedPostShared = (payload: { postId: string; shares: number }) => {
      if (!payload?.postId) return;
      setPosts((prev) =>
        prev.map((p) => (p.apiId === payload.postId || p.id === payload.postId ? { ...p, shares: payload.shares } : p))
      );
    };

    const onFeedPostCreated = (newPost: ApiFeedPost) => {
      if (!newPost?._id) return;
      if (currentUserId && newPost.author?._id === currentUserId) return;
      setPosts((prev) => {
        if (prev.some((p) => p.apiId === newPost._id || p.id === newPost._id)) return prev;
        const mapped = mapApiPostToUi(newPost);
        return [mapped, ...prev];
      });
    };

    // Listen for bookmark status changes in real-time
    const onBookmarkStatusChanged = (payload: { postId: string; isBookmarked: boolean; userId: string }) => {
      if (!payload?.postId) return;
      
      // Only update if this change is from another user
      if (payload.userId === currentUserId) return;
      
      // Update the post's bookmark status in all tabs
      setPosts((prev) =>
        prev.map((p) =>
          p.apiId === payload.postId || p.id === payload.postId
            ? { ...p, isBookmarked: payload.isBookmarked }
            : p
        )
      );
    };

    socket.on('feed_post_shared', onFeedPostShared);
    socket.on('feed_post_created', onFeedPostCreated);
    socket.on('bookmark_status_changed', onBookmarkStatusChanged);

    // Only remove OUR listeners — never disconnect the shared socket.
    return () => {
      socket.off('feed_post_shared', onFeedPostShared);
      socket.off('feed_post_created', onFeedPostCreated);
      socket.off('bookmark_status_changed', onBookmarkStatusChanged);
    };
  }, [currentUserId]);

  const handleSharePost = async (post: Post) => {
    if (!post.apiId) return;

    try {
      const shareUrl = `${window.location.origin}/#post/${post.apiId}`;
      const shareText = `${post.author.name}: ${post.content}`;

      await api.post(`/feed/${post.apiId}/share`);

      if (navigator.share) {
        try {
          await navigator.share({ title: 'NextIgnition Post', text: shareText, url: shareUrl });
        } catch {
          showToast('Failed to open share sheet', 'error');
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Link copied to clipboard!', 'success');
      }
    } catch {
      showToast('Could not copy link', 'error');
    }
  };

  const handleCreatePost = async () => {
    const content = postContent.trim();
    if (!content && !postFile && !pollQuestion && !milestoneTitle) return;
    setCreatePostError('');
    setPostSubmitting(true);
    try {
      const formData = new FormData();
      if (content) formData.append('content', content);
      formData.append('type', selectedPostType);

      if (postFile && ['image', 'video', 'document'].includes(selectedPostType)) {
        formData.append('media', postFile);
      }

      if (selectedPostType === 'poll' && pollQuestion) {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        if (validOptions.length < 2) {
            throw new Error('Poll must have at least two options.');
        }
        formData.append('poll', JSON.stringify({
            question: pollQuestion,
            options: validOptions.map(text => ({ text, votes: 0, percentage: 0 })),
            totalVotes: 0,
            userVoted: null
        }));
      }

      if (selectedPostType === 'milestone' && milestoneTitle && milestoneType) {
        formData.append('milestone', JSON.stringify({
            title: milestoneTitle,
            description: milestoneType,
            icon: 'Trophy', 
            color: 'text-yellow-500'
        }));
      }

      const resp = await api.post('/feed', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = mapApiPostToUi(resp.data as ApiFeedPost);
      setPosts((prev) => {
        if (prev.some(p => p.id === created.id)) return prev;
        return [created, ...prev];
      });
      setPostContent('');
      setPostFile(null);
      setPollQuestion('');
      setPollOptions(['', '']);
      setMilestoneTitle('');
      setMilestoneType('');
      setShowCreateModal(false);
      onCreateModalClose?.();
      setFeedError('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create post';
      setCreatePostError(msg);
      setFeedError(msg);
    } finally {
      setPostSubmitting(false);
    }
  };

  const handleEnhancePost = async () => {
    if (!postContent.trim()) {
      showToast('Please write something first to enhance!', 'error');
      return;
    }
    setIsEnhancing(true);
    try {
      const data = await enhancePostContent(postContent);
      if (data && data.enhanced && Array.isArray(data.enhanced)) {
        setAiEnhancedVersions(data.enhanced);
        setShowAIEnhancer(true);
      } else {
        throw new Error('Invalid AI response');
      }
    } catch (err) {
      console.error('AI Enhancement failed:', err);
      showToast('AI enhancement failed. Please try again.', 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = (commentText[postId] || '').trim();
    if (!text) return;

    const target = posts.find((p) => p.id === postId);
    if (!target?.apiId) return;

    try {
      const resp = await api.post(`/feed/${target.apiId}/comment`, { text });
      setCommentText((prev) => ({ ...prev, [postId]: '' }));

      // Update the specific post in the state instead of full fetch for better UX
      if (resp.data) {
        const updatedPost = mapApiPostToUi(resp.data);
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add comment';
      setFeedError(msg);
    }
  };

  const postTypes = [
    { type: 'text' as const, icon: FileText, label: 'Text', color: brandColors.navyBlue },
    { type: 'image' as const, icon: ImageIcon, label: 'Image', color: brandColors.electricBlue },
    { type: 'video' as const, icon: Video, label: 'Video', color: brandColors.atomicOrange },
    { type: 'poll' as const, icon: BarChart3, label: 'Poll', color: '#10b981' },
    { type: 'milestone' as const, icon: Trophy, label: 'Milestone', color: '#f59e0b' },
    { type: 'document' as const, icon: FileText, label: 'Document', color: '#8b5cf6' },
  ];

  const handleLike = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target?.apiId) {
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ));
      return;
    }

    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));

    try {
      await api.post(`/feed/${target.apiId}/like`);
    } catch {
      // best-effort; keep optimistic UI
    }
  };

  const handleBookmark = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target?.apiId) {
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, isBookmarked: !post.isBookmarked }
          : post
      ));
      return;
    }

    // Optimistic UI update
    const newBookmarkStatus = !target.isBookmarked;
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, isBookmarked: newBookmarkStatus }
        : post
    ));

    try {
      const resp = await api.post(`/feed/${target.apiId}/save`);
      const isNowSaved = resp.data.saved;
      showToast(isNowSaved ? 'Post saved to bookmarks' : 'Bookmark removed', 'success');
      
      // Emit real-time bookmark status update to other tabs/clients
      const socket = getSocket();
      socket.emit('bookmark_status_changed', {
        postId: target.apiId,
        isBookmarked: isNowSaved,
        userId: currentUserId
      });
      
      // If we are in the "Saved" tab and just removed a bookmark, remove it from list
      if (!isNowSaved && activeFilter === 'Saved') {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to save post', err);
      showToast('Failed to update bookmark', 'error');
      // Revert the optimistic UI update on error
      setPosts(posts.map(post =>
        post.id === postId
          ? { ...post, isBookmarked: target.isBookmarked }
          : post
      ));
    }
  };

  const handleVote = async (postId: string, optionIndex: number) => {
    const target = posts.find((p) => p.id === postId);
    if (!target?.apiId) return;

    try {
      const resp = await api.post(`/feed/${target.apiId}/vote`, { optionIndex });
      if (resp.data) {
        const updatedPost = mapApiPostToUi(resp.data);
        setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit vote', 'error');
    }
  };

  const toggleVideo = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      if (playingVideo === postId) {
        video.pause();
        setPlayingVideo(null);
      } else {
        video.play();
        setPlayingVideo(postId);
      }
    }
  };

  const toggleMute = (postId: string) => {
    const video = videoRefs.current[postId];
    if (video) {
      video.muted = !video.muted;
      setMutedVideo(video.muted ? postId : null);
    }
  };

  useEffect(() => {
    if (showConfetti !== null) {
      const timer = setTimeout(() => setShowConfetti(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  // Close post menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (postMenuRef.current && !postMenuRef.current.contains(event.target as Node)) {
        setOpenPostMenu(null);
      }
    };

    if (openPostMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openPostMenu]);

  const handleDeletePost = (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setPosts(posts.filter(p => p.id !== postId));
      setOpenPostMenu(null);
    }
  };

  const handleCopyLink = (postId: string) => {
    const link = `${window.location.origin}/#post/${postId}`;
    try {
      const p = navigator.clipboard?.writeText(link);
      if (p && typeof p.catch === 'function') p.catch(() => {});
      showToast('Post link copied to clipboard!', 'success');
    } catch {
      showToast('Could not copy link.', 'error');
    }
    setOpenPostMenu(null);
  };

  const handleHidePost = (postId: string) => {
    setPosts(posts.filter(p => p.id !== postId));
    setOpenPostMenu(null);
    showToast('Post hidden from your feed', 'info');
  };

  const renderPost = (post: Post, index: number) => {
    const isExpanded = expandedPost === post.id;
    const shouldTruncate = post.content.length > 280 && post.type === 'text';
    const displayContent = shouldTruncate && !isExpanded
      ? post.content.slice(0, 280) + '...'
      : post.content;

    return (
      <motion.div
        key={`post-${post.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors overflow-hidden relative"
      >
        {/* Confetti Animation for Milestone Posts */}
        {post.type === 'milestone' && showConfetti === post.id && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#f78405', '#6666ff', '#f59e0b', '#10b981', '#ef4444'][i % 5],
                  left: `${Math.random() * 100}%`,
                  top: -10,
                }}
                animate={{
                  y: [0, 600],
                  x: [0, (Math.random() - 0.5) * 200],
                  rotate: [0, Math.random() * 360],
                  opacity: [1, 0],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
        )}

        <div className="p-4 md:p-6">
          {/* Post Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <Avatar 
                src={post.author.avatar} 
                name={post.author.name} 
                size="lg" 
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-gray-900">{post.author.name}</h4>
                  {post.author.verified && (
                    <BadgeCheck className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{post.author.title}</p>
                <p className="text-xs text-gray-400">{post.timestamp}</p>
              </div>
            </div>
            <div className="relative">
              <button
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPostMenu(openPostMenu === post.id ? null : post.id);
                }}
              >
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>

              {/* Post Actions Dropdown Menu */}
              <AnimatePresence>
                {openPostMenu === post.id && (
                  <motion.div
                    ref={postMenuRef}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Show Edit & Delete for user's own posts */}
                    {post.author._id === currentUserId && (
                      <div>
                        {Capacitor.getPlatform() !== 'ios' && (
                          <button
                            onClick={() => {
                              setOpenPostMenu(null);
                              showToast('Edit feature coming soon.', 'info');
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Edit post</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Delete post</span>
                        </button>
                        <div className="border-t border-gray-200" />
                      </div>
                    )}

                    {/* Common actions for all posts */}
                    <button
                      onClick={() => {
                        handleBookmark(post.id);
                        setOpenPostMenu(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Bookmark className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {post.isBookmarked ? 'Remove bookmark' : 'Save post'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleCopyLink(post.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Copy className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Copy link</span>
                    </button>

                    {/* Show hide/report for other people's posts */}
                    {post.author._id !== currentUserId && (
                      <div>
                        <div className="border-t border-gray-200" />
                        <button
                          onClick={() => handleHidePost(post.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <EyeOff className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Hide post</span>
                        </button>
                        <button
                          onClick={() => {
                            setOpenPostMenu(null);
                            setReportPost({ id: post.id, author: post.author.name });
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Flag className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Report post</span>
                        </button>
                        <button
                          onClick={() => {
                            setOpenPostMenu(null);
                            showToast(`You have muted ${post.author.name}`, 'info');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <VolumeOff className="w-4 h-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">Mute {post.author.name}</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Milestone Badge */}
          {post.type === 'milestone' && post.milestone && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4 p-4 rounded-xl"
              style={{ backgroundColor: `${post.milestone.color}15` }}
              onClick={() => setShowConfetti(post.id)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${post.milestone.color}30` }}
                >
                  <post.milestone.icon
                    className="w-6 h-6"
                    style={{ color: post.milestone.color }}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-lg" style={{ color: post.milestone.color }}>
                    {post.milestone.title}
                  </h4>
                  <p className="text-sm text-gray-600">{post.milestone.description}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Post Content */}
          <div className="mb-4">
            <p className="text-gray-800 whitespace-pre-line">{displayContent}</p>
            {shouldTruncate && (
              <button
                onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm mt-2"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Image Grid */}
          {post.type === 'image' && post.images && (
            <div className={`grid gap-2 mb-4 ${post.images.length === 1 ? 'grid-cols-1' :
                post.images.length === 2 ? 'grid-cols-2' :
                  post.images.length === 3 ? 'grid-cols-3' :
                    'grid-cols-2'
              }`}>
              {post.images.map((img, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  className={`relative cursor-pointer rounded-lg overflow-hidden ${post.images!.length > 3 && idx === 0 ? 'col-span-2' : ''
                    }`}
                  onClick={() => { setLightboxImages(post.images!); setSelectedImage(idx); }}
                >
                  <img
                    src={img}
                    alt={`Post image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: post.images!.length === 1 ? '16/9' : '1/1' }}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Video Player */}
          {post.type === 'video' && post.video && (
            <div className="relative mb-4 rounded-lg overflow-hidden bg-black">
              <video
                ref={(el) => {
                  videoRefs.current[post.id] = el;
                }}
                className="w-full"
                poster={post.video.thumbnail}
                muted
              >
                <source src={post.video.url} type="video/mp4" />
              </video>
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => toggleVideo(post.id)}
                  className="w-16 h-16 bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition-colors"
                >
                  {playingVideo === post.id ? (
                    <Pause className="w-8 h-8 text-gray-900" />
                  ) : (
                    <Play className="w-8 h-8 text-gray-900 ml-1" />
                  )}
                </button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="text-white text-sm font-medium bg-black/50 px-3 py-1 rounded">
                  {post.video.duration}
                </span>
                <button
                  onClick={() => toggleMute(post.id)}
                  className="w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                >
                  {mutedVideo === post.id ? (
                    <VolumeX className="w-5 h-5 text-white" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Poll */}
          {post.type === 'poll' && post.poll && Array.isArray(post.poll.options) && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <h4 className="font-bold text-gray-900 mb-4">{post.poll.question}</h4>
              <div className="space-y-3">
                {post.poll.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => post.poll!.userVoted === null && handleVote(post.id, idx)}
                    disabled={post.poll!.userVoted !== null}
                    className={`w-full text-left p-3 rounded-lg transition-all relative overflow-hidden ${post.poll!.userVoted === idx
                        ? 'bg-blue-500 text-white'
                        : post.poll!.userVoted !== null
                          ? 'bg-gray-200'
                          : 'bg-white hover:bg-gray-100 border border-gray-300'
                      }`}
                  >
                    <div
                      className="absolute inset-0 bg-blue-100 transition-all"
                      style={{
                        width: post.poll!.userVoted !== null ? `${option.percentage}%` : '0%',
                        opacity: 0.3,
                      }}
                    />
                    <div className="relative flex items-center justify-between">
                      <span className="font-medium">{option.text}</span>
                      {post.poll!.userVoted !== null && (
                        <span className="font-bold">{option.percentage}%</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                {post.poll.totalVotes} {post.poll.totalVotes === 1 ? 'vote' : 'votes'}
              </p>
            </div>
          )}

          {/* Document */}
          {post.type === 'document' && post.document && (
            <div className="mb-4 p-4 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{post.document.title}</h4>
                  <p className="text-sm text-gray-600">
                    {post.document.type} • {post.document.size}
                  </p>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 py-3 border-t border-b border-gray-200 text-sm text-gray-600">
            <span>{post.likes} likes</span>
            <button
              onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              className="hover:text-blue-600 hover:underline transition-colors"
            >
              {post.comments} comments
            </button>
            <span>{post.shares} shares</span>
          </div>

          {/* Comments List */}
          {isExpanded && post.apiComments && post.apiComments.length > 0 && (
            <div className="mt-4 space-y-4 max-h-60 overflow-y-auto pr-2">
              {post.apiComments.map((comment, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <Avatar 
                    src={comment.user.avatar} 
                    name={comment.user.name} 
                    size="sm" 
                  />
                  <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{comment.user.name}</span>
                      <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 pt-4 px-1 pb-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-600'
                }`}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${post.isLiked ? 'fill-current' : ''}`} />
              <span className="font-semibold text-xs sm:text-sm">Like</span>
            </motion.button>
            <button
              onClick={() => setActiveCommentBox(activeCommentBox === post.id ? null : post.id)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">Comment</span>
            </button>
            <button
              onClick={() => setSharePostTarget(post)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold text-xs sm:text-sm">Share</span>
            </button>
            
            <div className="flex-1"></div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleBookmark(post.id)}
              className={`p-2 rounded-full transition-colors ${post.isBookmarked ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
              title={post.isBookmarked ? "Remove from saved" : "Save post"}
            >
              <Bookmark className={`w-5 h-5 ${post.isBookmarked ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {/* Comment Input — only visible when user clicks Comment */}
          {activeCommentBox === post.id && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar 
                  src={currentUser?.avatar} 
                  name={currentUser?.name || currentUserName || 'You'} 
                  size="sm" 
                />
                <div className="flex-1 relative">
                  <textarea name="textarea-fc3688"
                    autoFocus
                    value={commentText[post.id] || ''}
                    onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(post.id);
                        setActiveCommentBox(null);
                      }
                    }}
                    placeholder="Write a comment..."
                    className="w-full px-5 py-3 pr-20 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-500 resize-none overflow-hidden leading-relaxed transition-all"
                    rows={1}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="relative flex items-center" ref={activeCommentEmojiPicker === post.id ? commentEmojiPickerRef : null}>
                      <button 
                        onClick={() => setActiveCommentEmojiPicker(activeCommentEmojiPicker === post.id ? null : post.id)}
                        className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <Smile className="w-5 h-5 text-gray-500" />
                      </button>
                      {activeCommentEmojiPicker === post.id && (
                        <div className="absolute bottom-full right-0 z-[60] mb-2 shadow-2xl">
                          <EmojiPicker 
                            onEmojiClick={(emojiData: any) => {
                              const emoji = emojiData.emoji;
                              setCommentText(prev => ({ ...prev, [post.id]: (prev[post.id] || '') + emoji }));
                              setActiveCommentEmojiPicker(null);
                            }} 
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { handleAddComment(post.id); setActiveCommentBox(null); }}
                      disabled={!commentText[post.id]?.trim()}
                      className="p-1.5 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5 text-blue-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full flex items-center gap-3 shadow-xl ${
              toastMessage.type === 'error' ? 'bg-red-500 text-white' :
              toastMessage.type === 'success' ? 'bg-green-500 text-white' :
              'bg-gray-900 text-white'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> :
             toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> :
             <Info className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium text-sm">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Story Modal */}
      <AnimatePresence>
        {showCreateStoryModal && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Create Story</h3>
                <button
                  onClick={() => setShowCreateStoryModal(false)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                <textarea name="textarea-bf35cb"
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Share a thought, moment, or milestone with your network..."
                  className="w-full min-h-[150px] p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-4"
                  autoFocus
                />
                
                <input name="input-78ac7b"
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={(e) => setStoryFile(e.target.files?.[0] || null)}
                />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium text-gray-700"
                  >
                    <ImageIcon className="w-5 h-5 text-blue-500" />
                    {storyFile ? 'Change Media' : 'Add Photo/Video'}
                  </button>
                  {storyFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                      <Sparkles className="w-4 h-4" />
                      {storyFile.name}
                      <button 
                        onClick={() => setStoryFile(null)}
                        className="p-1 hover:bg-gray-200 rounded-full"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateStoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStory}
                  disabled={(!storyContent.trim() && !storyFile) || creatingStory}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {creatingStory ? 'Posting...' : 'Post Story'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        /* Mobile optimizations */
        @media (max-width: 1024px) {
          /* Reduced font sizes by 25% */
          .mobile-h1 { font-size: 24px !important; } /* from 32px */
          .mobile-h2 { font-size: 20px !important; } /* from 27px */
          .mobile-h3 { font-size: 18px !important; } /* from 24px */
          .mobile-body { font-size: 14px !important; } /* from 16-18px */
          .mobile-small { font-size: 12px !important; } /* from 14px */
          .mobile-xs { font-size: 11px !important; } /* from 12-13px */
          
          /* Card padding reduction */
          .mobile-card { padding: 12px !important; }
          .mobile-card-lg { padding: 16px !important; }
          
          /* Touch targets */
          .touch-target {
            min-width: 44px;
            min-height: 44px;
          }
          
          /* Hide on mobile */
          .hide-mobile { display: none !important; }
          
          /* Full width on mobile */
          .mobile-full { width: 100% !important; }
          
          /* Image auto-resize */
          .mobile-img {
            width: 100% !important;
            height: auto !important;
            object-fit: cover;
          }
        }
      `}</style>

      {/* Stories Section - Horizontal Scroll */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 mb-0 lg:mb-6">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
              onClick={() => {
                if (story.id === 1) {
                  setShowCreateStoryModal(true);
                } else {
                  setSelectedStoryIndex(index);
                  setShowStoryViewer(true);
                }
              }}
            >
              <div className={`relative ${story.id === 1 ? '' : story.viewed ? 'opacity-60' : ''}`}>
                {story.id === 1 ? (
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-dashed border-gray-400">
                    <Plus className="w-6 h-6 text-gray-600" />
                  </div>
                ) : (
                  <div className={`p-0.5 rounded-full ${story.viewed ? 'bg-gray-300' : 'bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600'}`}>
                    <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center border-2 border-white">
                      <Avatar 
                        src={story.avatar} 
                        name={story.author} 
                        size="xl" 
                      />
                    </div>
                  </div>
                )}
                {story.id !== 1 && !story.viewed && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <span className="text-xs text-gray-600 text-center max-w-[70px] truncate">
                {story.author}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="h-4" /> {/* Spacer */}


      <div className="grid lg:grid-cols-12 gap-6 px-4 lg:px-[24px] py-[0px]">
        {/* Center Feed */}
        <main className="lg:col-span-8 space-y-4 lg:space-y-6 w-full overflow-hidden">
          {/* Unified Feed Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Action Header */}
            <div className="p-4 lg:p-6 border-b border-gray-100 bg-white">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full max-w-full">
                {/* Filter Dropdown Button */}
                <div className="relative flex-1 min-w-0">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="w-full touch-target sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200 min-w-[180px] active:scale-95"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <span className="font-bold text-gray-700 text-sm">
                        {activeFilter}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showFilterDropdown ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Filter Dropdown */}
                  <AnimatePresence>
                    {showFilterDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[250px] mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                      >
                        {feedFilters.map((filter) => (
                          <button
                            key={filter}
                            onClick={() => {
                              setActiveFilter(filter);
                              setShowFilterDropdown(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${activeFilter === filter ? 'bg-blue-50' : ''
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeFilter === filter
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-600'
                              }`}
                              style={activeFilter === filter ? {
                                background: `linear-gradient(135deg, #4f46e5, #2563eb)`
                              } : {}}
                            >
                              {filter === 'Following' && <Users className="w-4 h-4" />}
                              {filter === 'Discover' && <Search className="w-4 h-4" />}
                              {filter === 'Trending' && <TrendingUp className="w-4 h-4" />}
                              {filter === 'Saved' && <Bookmark className="w-4 h-4" />}
                            </div>
                            <span className={`font-medium text-sm ${activeFilter === filter ? 'text-gray-900 font-bold' : 'text-gray-700'
                              }`}>
                              {filter}
                            </span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Create Event Button - Expert & Investor Only */}
                {(userType === 'expert' || userType === 'investor') && (
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
                  >
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="whitespace-nowrap text-sm">Create Event</span>
                  </button>
                )}

                {/* Create Post Button */}
                <button
                  onClick={() => { setShowCreateModal(true); setCreatePostError(''); }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all duration-200"
                  style={{
                    background: `linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)`,
                  }}
                >
                  <Plus className="w-5 h-5" />
                  <span className="whitespace-nowrap text-sm">Create Post</span>
                </button>
              </div>
            </div>

            {/* Post Feed List */}
            <div className="divide-y divide-gray-100">
              {rankedPosts.map((post, index) => (
                  <div key={post.id} ref={trackImpression(post.apiId)}>
                    {renderPost(post, index)}
                  </div>
                ))}

              {rankedPosts.length === 0 && (
                <div className="text-center py-24 px-6 mt-8">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    {activeFilter === 'Following'
                      ? <Users className="w-8 h-8 text-gray-300" />
                      : <Bookmark className="w-8 h-8 text-gray-300" />}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {activeFilter === 'Following' ? 'Your Following feed is empty' : 'No posts found'}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-xs mx-auto">
                    {activeFilter === 'Saved'
                      ? "You haven't saved any posts yet. Bookmark posts to see them here."
                      : activeFilter === 'Following'
                      ? "Follow founders, experts and investors to see their posts here, or switch to Discover."
                      : "There are no posts to display here right now."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Load More — placeholder pager (no real pagination); hidden on iOS (Apple 4.2) */}
          {posts.length > 0 && Capacitor.getPlatform() !== 'ios' && (
            <div className="text-center py-6">
              <button
                onClick={() => {
                  showToast('Fetching older posts...', 'info');
                  setTimeout(() => showToast('You are caught up!', 'success'), 1000);
                }}
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm text-gray-700"
              >
                Load More Posts
              </button>
            </div>
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="hidden lg:block lg:col-span-4 space-y-6">
          {trendingTopics.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Trending Topics
              </h3>
              <div className="space-y-3">
                {trendingTopics.map((topic, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-bold text-blue-600">{topic.tag}</div>
                      <div className="text-sm text-gray-600">{topic.posts.toLocaleString()} posts</div>
                    </div>
                    <div className="text-sm font-bold text-green-600">{topic.trend}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {suggestedConnections.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                Suggested Connections
              </h3>
              <div className="space-y-4">
                {suggestedConnections.map((person, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Avatar 
                      src={person.avatar} 
                      name={person.name} 
                      size="md" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{person.name}</h4>
                      <p className="text-xs text-gray-600 truncate">{person.title}</p>
                      <p className="text-xs text-gray-500">{person.mutual}</p>
                    </div>
                    <button 
                      onClick={() => showToast(`Connection request sent to ${person.name}`, 'success')}
                      className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Create Post Modal — NOT wrapped in AnimatePresence: a portaled motion
          child never receives the enter animation, so it stays stuck at opacity 0
          (invisible). Rendering it directly lets it animate in on mount. */}
      {showCreateModal && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-2 sm:p-4 overflow-hidden"
            onClick={() => { setShowCreateModal(false); setCreatePostError(''); onCreateModalClose?.(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Create Post</h2>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreatePostError(''); onCreateModalClose?.(); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 text-left">
                {createPostError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {createPostError}
                  </div>
                )}
                {/* Post Type Selector */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                  {postTypes.map((type) => (
                    <button
                      key={type.type}
                      onClick={() => setSelectedPostType(type.type)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedPostType === type.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                      <type.icon
                        className="w-6 h-6"
                        style={{ color: selectedPostType === type.type ? type.color : '#6b7280' }}
                      />
                      <span className={`text-xs font-medium ${selectedPostType === type.type ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                        {type.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <Avatar 
                    src={currentUser?.avatar} 
                    name={currentUser?.name || currentUserName || 'You'} 
                    size="lg" 
                  />
                  <div>
                    <h3 className="font-bold text-gray-900">{currentUserName}</h3>
                    <p className="text-sm text-gray-600">Post publicly</p>
                  </div>
                </div>

                {/* Content Input */}
                <textarea name="textarea-32be77"
                  placeholder="What's on your mind?"
                  rows={6}
                  value={postContent}
                  onChange={(e) => { setPostContent(e.target.value); setCreatePostError(''); }}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
                />

                {/* Type-specific inputs */}
                <input name="input-9f12ea"
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                     const file = e.target.files?.[0];
                     if(file) {
                        setPostFile(file);
                        showToast(`Selected file: ${file.name}`, 'success');
                     }
                  }}
                  accept="image/*,video/*,.pdf,.doc,.docx"
                />

                {selectedPostType === 'image' && (
                  <div onClick={() => fileInputRef.current?.click()} className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">{postFile ? postFile.name : 'Click to upload images'}</p>
                    <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                  </div>
                )}

                {selectedPostType === 'video' && (
                  <div onClick={() => fileInputRef.current?.click()} className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">{postFile ? postFile.name : 'Click to upload video'}</p>
                    <p className="text-sm text-gray-500 mt-1">MP4, MOV, AVI up to 100MB</p>
                  </div>
                )}

                {selectedPostType === 'poll' && (
                  <div className="mb-4 space-y-3">
                    <input name="input-0f769d"
                      type="text"
                      placeholder="Poll question"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {pollOptions.map((opt, i) => (
                      <input key={i}
                        type="text"
                        placeholder={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[i] = e.target.value;
                            setPollOptions(newOptions);
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                    {pollOptions.length < 5 && (
                        <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                          <Plus className="w-4 h-4" />
                          Add option
                        </button>
                    )}
                  </div>
                )}

                {selectedPostType === 'milestone' && (
                  <div className="mb-4 space-y-3">
                    <input name="input-9e5df0"
                      type="text"
                      placeholder="Milestone title (e.g., 'Raised $1M')"
                      value={milestoneTitle}
                      onChange={(e) => setMilestoneTitle(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select name="select-9bb387" 
                      value={milestoneType}
                      onChange={(e) => setMilestoneType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select milestone type</option>
                      <option value="💰 Funding">💰 Funding</option>
                      <option value="🚀 Product Launch">🚀 Product Launch</option>
                      <option value="👥 Team Milestone">👥 Team Milestone</option>
                      <option value="📈 Growth Milestone">📈 Growth Milestone</option>
                      <option value="🏆 Award/Recognition">🏆 Award/Recognition</option>
                    </select>
                  </div>
                )}

                {selectedPostType === 'document' && (
                  <div onClick={() => fileInputRef.current?.click()} className="mb-4 p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-gray-400 transition-colors">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">{postFile ? postFile.name : 'Click to upload document'}</p>
                    <p className="text-sm text-gray-500 mt-1">PDF, DOC, PPT up to 10MB</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 flex-wrap relative">
                    <div className="relative flex items-center" ref={emojiPickerRef}>
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add emoji">
                        <Smile className="w-5 h-5 text-gray-600" />
                      </button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 left-0 z-50">
                          <EmojiPicker onEmojiClick={(emojiData: any) => {
                            setPostContent(prev => prev + emojiData.emoji);
                            setShowEmojiPicker(false);
                          }} />
                        </div>
                      )}
                    </div>
                    {Capacitor.getPlatform() !== 'ios' && (
                      <button onClick={() => showToast('Location tagging coming soon', 'info')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add location">
                        <MapPin className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    {Capacitor.getPlatform() !== 'ios' && (
                      <button onClick={() => showToast('Link preview coming soon', 'info')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Add link">
                        <LinkIcon className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    {Capacitor.getPlatform() !== 'ios' && (
                      <button onClick={() => showToast('Post scheduling feature coming soon', 'info')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Schedule post">
                        <Calendar className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* AI Enhance Button */}
                    <button
                      onClick={handleEnhancePost}
                      disabled={isEnhancing || !postContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm font-medium disabled:opacity-50"
                    >
                      {isEnhancing ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={postSubmitting || (!postContent.trim() && !postFile && !pollQuestion && !milestoneTitle)}
                      className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r text-white rounded-lg font-bold hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})`,
                      }}
                    >
                      {postSubmitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightboxImages?.[selectedImage]}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Enhancer Modal — same fix: no AnimatePresence around a portaled
          motion child (would stay stuck invisible at opacity 0). */}
      {showAIEnhancer && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4 overflow-hidden"
            onClick={() => setShowAIEnhancer(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <h2 className="text-xl font-bold">AI Enhanced Versions</h2>
                </div>
                <button
                  onClick={() => setShowAIEnhancer(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 text-left">
                <p className="text-gray-600 mb-6">
                  Select one of the AI-enhanced versions below, or continue editing:
                </p>

                {/* Enhanced Versions */}
                <div className="space-y-4">
                  {isEnhancing && (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-[#6666FF]/20 border-t-[#6666FF] rounded-full animate-spin" />
                      <p className="text-gray-500 font-medium animate-pulse">Ignisha is crafting your versions...</p>
                    </div>
                  )}

                  {!isEnhancing && aiEnhancedVersions.length === 0 && (
                    <div className="py-20 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No versions generated yet. Click generate to start!</p>
                    </div>
                  )}

                  {!isEnhancing && aiEnhancedVersions.map((version, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 border-2 border-gray-200 rounded-xl hover:border-[#6666FF] transition-all cursor-pointer group relative"
                      onClick={() => {
                        setPostContent(version);
                        setShowAIEnhancer(false);
                      }}
                    >
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="px-3 py-1 bg-[#6666FF] text-white text-xs font-medium rounded-full">
                          Select
                        </div>
                      </div>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6666FF] to-[#F78405] flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-[#6666FF] mb-1">Version {idx + 1}</div>
                          <p className="text-gray-800 leading-relaxed">{version}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 flex-shrink-0">
                  <button
                    onClick={() => setShowAIEnhancer(false)}
                    className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Keep Original
                  </button>
                  <button
                    onClick={handleEnhancePost}
                    disabled={isEnhancing}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#6666FF] to-[#F78405] text-white rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                  >
                    {isEnhancing ? (
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                       <Sparkles className="w-4 h-4" />
                    )}
                    {isEnhancing ? 'Generating...' : 'Generate New Versions'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}

      <CreateEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        userType={userType}
      />

      <ReportDialog
        open={!!reportPost}
        onClose={() => setReportPost(null)}
        targetType="post"
        targetId={reportPost?.id || ''}
        targetLabel={reportPost ? `Post by ${reportPost.author}` : undefined}
      />

      {/* Story Viewer */}
      {showStoryViewer && (
        <StoryViewer
          stories={stories.filter(s => s.id !== 1)} // Exclude "Add Story"
          initialIndex={selectedStoryIndex - 1} // Adjust for filtered array
          onClose={() => setShowStoryViewer(false)}
          onReply={async (story, text) => {
            if (story.authorId) {
              try {
                await sendMessage(story.authorId, text);
                showToast(`Reply sent to ${story.author}`, 'success');
              } catch {
                showToast('Could not deliver your reply right now.', 'error');
              }
            } else {
              showToast(`Reply sent to ${story.author}`, 'success');
            }
          }}
        />
      )}

      {/* In-app "Share to chat" sheet — DMs + Communities */}
      <SharePostModal
        post={sharePostTarget}
        isOpen={!!sharePostTarget}
        onClose={() => setSharePostTarget(null)}
        onShared={() => {
          if (sharePostTarget) {
            setPosts(prev =>
              prev.map(p => (p.id === sharePostTarget.id ? { ...p, shares: p.shares + 1 } : p))
            );
          }
          showToast('Post shared', 'success');
        }}
      />
    </div>
  );
}