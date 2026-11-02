import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../services/socketService';
import { Socket } from 'socket.io-client';
import Peer, { SignalData } from 'simple-peer';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '../services/api';
import { brandColors } from '../utils/colors';
import { getSingletonApiBase } from '../utils/apiResolution';
import { getCurrentUser, updateVoiceSettings, logout as logoutUser } from '../services/authService';
import { toast } from 'sonner';
import { useMediaPermission } from '../hooks/useMediaPermission';
import {
  Hash,
  Volume2,
  VolumeX,
  Users,
  Search,
  Bell,
  BellOff,
  Pin,
  Settings,
  Plus,
  Smile,
  Paperclip,
  Send,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  LogOut,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Play,
  Pause,
  Crown,
  Rocket,
  Handshake,
  Trophy,
  Sparkles,
  ArrowLeft,
  Home,
  X,
  Check,
  MoreHorizontal,
  FolderPlus,
  FileText,
  File as FileIcon,
  Briefcase,
  ShieldCheck,
  UserPlus,
  MessageSquare,
  Lock,
  Volume1,
  Camera,
  Video,
  VideoOff,
  BadgeCheck,
  CheckCircle,
  AlertCircle,
  Trash2,
  Flag,
} from 'lucide-react';
import { ReportDialog } from './ReportDialog';


interface AudioMessagePlayerProps {
  src: string;
}

const AudioMessagePlayer = ({ src }: AudioMessagePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => console.error('Audio play failed:', err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      // Some browsers return Infinity for stream metadata duration
      if (isFinite(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const val = parseFloat(e.target.value);
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200/60 rounded-2xl p-3 max-w-sm w-full mt-2 shadow-sm animate-in fade-in duration-200">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 shadow-sm"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current text-white" />
        ) : (
          <Play className="w-4 h-4 fill-current text-white ml-0.5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
        />
        <div className="flex justify-between items-center mt-1 text-[10px] font-bold text-gray-500">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
};

export interface CommunitiesPageProps {
  userRole: 'founder' | 'expert' | 'investor';
  userId: string | number;
  initialCommunityId?: string;
  onBack?: () => void;
  onMenuClick?: () => void;
}

interface ApiCommunity {
  _id: string;
  name: string;
  icon: string;
  roleExclusive?: string;
  unreadCount?: number;
  memberCount: number;
  description: string;
  allowedRoles: string[];
  settings?: { visibility: string; joinPolicy: string };
  members?: string[];
  pendingMembers?: string[];
}

const DEFAULT_COMMUNITY_ICON = '🚀';

/**
 * Keyword -> emoji rules used to give each community a relatable icon based on
 * its name (and description). First match wins, so order from most specific to
 * most generic.
 */
const COMMUNITY_ICON_RULES: Array<[RegExp, string]> = [
  [/lounge|central hub|members? hub|main hub/i, '🛋️'],
  [/feedback|validat|review|critique|idea/i, '🔍'],
  [/fundrais|investor|funding|capital|venture|\bvc\b|angel|pitch/i, '💰'],
  [/event|podcast|webinar|opportunit|meetup|workshop/i, '🎙️'],
  [/build|growth|\bgrow\b|scal|execution|operations/i, '📈'],
  [/product|\bmvp\b|design|prototype/i, '🛠️'],
  [/tech|engineer|developer|coding|software/i, '💻'],
  [/market|sales|customer|brand|advertis/i, '📣'],
  [/legal|compliance|policy|regulat/i, '⚖️'],
  [/hiring|job|talent|recruit|co-?founder|team/i, '🤝'],
  [/expert|mentor|advisor/i, '🧠'],
  [/founder/i, '🚀'],
  [/general|global|network|connect|community/i, '🌐'],
];

/**
 * Picks a relatable icon for a community. A creator's custom icon is always
 * respected; only the generic default (or an empty icon) gets replaced with a
 * name-based emoji so the seeded/system communities stop looking identical.
 */
function getCommunityIcon(name?: string, storedIcon?: string): string {
  const stored = (storedIcon || '').trim();
  if (stored && stored !== DEFAULT_COMMUNITY_ICON) return stored;
  const text = name || '';
  for (const [pattern, emoji] of COMMUNITY_ICON_RULES) {
    if (pattern.test(text)) return emoji;
  }
  return stored || DEFAULT_COMMUNITY_ICON;
}

interface ApiChannel {
  _id: string;
  name: string;
  type: 'text' | 'voice';
  description: string;
  readOnly?: boolean;
  unreadCount?: number;
  visibility?: 'public' | 'private';
  restricted?: boolean;
  pending?: boolean;
  members?: string[];
  pendingMembers?: string[];
}

interface ApiMessage {
  _id: string;
  communityId: string;
  channelId: string;
  userId: ApiMember;
  content: string;
  type: string;
  createdAt: string;
  attachments?: {
    url: string;
    originalName: string;
    mimeType: string;
    size: number;
  }[];
  metadata?: {
    attachments?: {
      url: string;
      originalName: string;
      mimeType: string;
      size: number;
    }[];
  };
  sharedPostId?: any;
  reactions?: { emoji: string; count: number; users: string[] }[];
  threadCount?: number;
  pinned?: boolean;
  savedBy?: string[];
  milestoneData?: any;
  pollData?: any;
  replyTo?: {
    _id: string;
    content: string;
    userId: { name: string };
  };
}

interface ApiMember {
  _id: string;
  name: string;
  role: string;
  avatar?: string;
  isVerified?: boolean;
}

const VoiceSettingsModal = ({
  isOpen,
  onClose,
  settingsTab,
  setSettingsTab,
  inputVolume,
  setInputVolume,
  outputVolume,
  setOutputVolume,
  selectedMic,
  setSelectedMic,
  selectedSpeaker,
  setSelectedSpeaker,
  communityTheme,
  setCommunityTheme,
}: any) => {
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [testStage, setTestStage] = useState<'idle' | 'recording' | 'playing'>('idle');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      stream.getTracks().forEach(t => t.stop());
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setMics(devices.filter(d => d.kind === 'audioinput'));
        setSpeakers(devices.filter(d => d.kind === 'audiooutput'));
      });
    }).catch(err => {
      console.warn('Mic permission required to list devices:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please enable microphone access in your device settings.');
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || settingsTab !== 'audio') {
      stopTesting();
      cleanupAudio();
      return;
    }

    const constraints: MediaStreamConstraints = { 
      audio: selectedMic !== 'default' && selectedMic ? { deviceId: { exact: selectedMic } } : true 
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        mediaStreamRef.current = stream;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          setMicVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      })
      .catch(err => {
        console.warn("Mic access blocked", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Microphone access denied. Please enable microphone access in your device settings.');
        }
      });

    return () => cleanupAudio();
  }, [isOpen, settingsTab]);

  const cleanupAudio = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    analyserRef.current = null;
    setMicVolumeLevel(0);
  };

  const stopTesting = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsTestingAudio(false);
    setTestStage('idle');
  };

  const startAudioTest = () => {
    if (isTestingAudio) { stopTesting(); return; }
    if (!mediaStreamRef.current) { toast.error('Microphone not available'); return; }

    setIsTestingAudio(true);
    setTestStage('recording');
    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(mediaStreamRef.current);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
    mediaRecorder.onstop = () => {
      if (!isTestingAudio && testStage !== 'recording') return;
      setTestStage('playing');
      const audioUrl = URL.createObjectURL(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      const audio = new Audio(audioUrl);
      if (selectedSpeaker && selectedSpeaker !== 'default' && 'setSinkId' in audio) {
        (audio as any).setSinkId(selectedSpeaker).catch(console.warn);
      }
      playbackAudioRef.current = audio;
      audio.onended = () => {
        setTestStage('idle');
        setIsTestingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.play().catch(() => stopTesting());
    };
    mediaRecorder.start();
    setTimeout(() => { if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-2xl overflow-hidden flex flex-col border border-white/20 h-auto max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">User Settings</h2>
            <p className="text-sm font-medium text-gray-400 mt-1">Manage your community experience</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-200"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 px-4 py-4 space-y-2 border-r border-gray-100 bg-gray-50/30">
            {[
              { id: 'audio', label: 'Voice & Video', icon: Volume2 },
              { id: 'appearance', label: 'Appearance', icon: Sparkles },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-black tracking-wide transition-all duration-300 group ${
                  settingsTab === tab.id 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-200/50 translate-x-1 scale-[1.02]' 
                    : 'text-gray-400 hover:bg-white hover:text-indigo-600 hover:shadow-md'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${settingsTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
            {settingsTab === 'audio' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Input Settings</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Input Device</label>
                      <select name="select-5c90db" 
                        value={selectedMic}
                        onChange={(e) => setSelectedMic(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent group-hover:border-gray-100 rounded-2xl focus:border-indigo-600 outline-none text-[15px] font-semibold transition-all appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                      >
                        <option value="default">Default Device</option>
                        {mics.map(mic => <option key={mic.deviceId} value={mic.deviceId}>{mic.label || 'Mic'}</option>)}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4 ml-1">
                        <label className="text-xs font-black text-gray-400 uppercase">Input Volume</label>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{inputVolume}%</span>
                      </div>
                      <input name="input-65e3ee" 
                        type="range" min="0" max="100" value={inputVolume}
                        onChange={(e) => setInputVolume(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                      />
                    </div>

                    <div className="pt-4">
                      <label className="block text-xs font-black text-gray-400 uppercase mb-3 ml-1">Input Sensitivity</label>
                      <div className="h-4 w-full bg-gray-50 rounded-full p-1 border border-gray-100 overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                          animate={{ width: `${micVolumeLevel}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-white rounded-3xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-900/60 leading-relaxed mb-4">
                        Test your microphone by recording a short loop. We'll play it back instantly so you can hear exactly how you sound in the lounge.
                      </p>
                      <button 
                        onClick={startAudioTest}
                        className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                          testStage === 'recording' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-red-200/50' :
                          testStage === 'playing' ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-green-200/50' :
                          'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-indigo-200/50'
                        }`}
                      >
                        {testStage === 'recording' ? <><div className="w-2 h-2 bg-white rounded-full animate-ping" /> Recording...</> : 
                         testStage === 'playing' ? <Volume2 className="w-5 h-5 animate-bounce" /> :
                         <Mic className="w-5 h-5" />}
                        {testStage === 'recording' ? 'Stop' : testStage === 'playing' ? 'Playing Loop' : 'Start Mic Test'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="pt-4">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Volume2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Output Settings</h3>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Output Device</label>
                      <select name="select-eab52d" 
                        value={selectedSpeaker}
                        onChange={(e) => setSelectedSpeaker(e.target.value)}
                        className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent group-hover:border-gray-100 rounded-2xl focus:border-indigo-600 outline-none text-[15px] font-semibold transition-all appearance-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                      >
                        <option value="default">Default Device</option>
                        {speakers.map(s => <option key={s.deviceId} value={s.deviceId}>{s.label || 'Speaker'}</option>)}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-4 ml-1">
                        <label className="text-xs font-black text-gray-400 uppercase">Output Volume</label>
                        <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{outputVolume}%</span>
                      </div>
                      <input name="input-84a86d" 
                        type="range" min="0" max="100" value={outputVolume}
                        onChange={(e) => setOutputVolume(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                      />
                    </div>
                  </div>
                </section>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={onClose}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-200/50 hover:from-indigo-700 hover:to-indigo-600 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Done
                  </button>
                </div>
              </div>
            )}

            
            {settingsTab === 'appearance' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">Themes</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: 'classic', label: 'Classic Dark', color: 'bg-gray-900', desc: 'Standard professional look' },
                      { id: 'modern', label: 'Indigo Night', color: 'bg-indigo-900', desc: 'Sleek & vibrant colors' },
                      { id: 'glass', label: 'Glassmorphism', color: 'bg-blue-400', desc: 'Frosted blur effect' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setCommunityTheme?.(theme.id)}
                        className={`p-5 rounded-[24px] border-4 text-left transition-all duration-300 relative overflow-hidden group ${
                          communityTheme === theme.id 
                            ? 'border-indigo-600 bg-indigo-50/50' 
                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl ${theme.color} shadow-lg mb-3 m-1 transition-transform group-hover:scale-110`} />
                        <h4 className="text-sm font-black text-gray-900">{theme.label}</h4>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">{theme.desc}</p>
                        {communityTheme === theme.id && (
                          <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={onClose}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-200/50 hover:from-indigo-700 hover:to-indigo-600 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Done
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};


export default function CommunitiesPage({ userRole, userId, initialCommunityId, onBack, onMenuClick }: CommunitiesPageProps & { onBack?: () => void }) {
  const { requestPermission: requestMicrophonePermission } = useMediaPermission('microphone');
  const [selectedCommunity, setSelectedCommunity] = useState<ApiCommunity | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ApiChannel | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showMemberList, setShowMemberList] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<ApiMessage[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(false);
  const [showCommunityAdmin, setShowCommunityAdmin] = useState(false);
  const [communitySettings, setCommunitySettings] = useState<any>(null);
  const [savingCommunitySettings, setSavingCommunitySettings] = useState(false);
  const [mobileView, setMobileView] = useState<'communities' | 'channels' | 'chat' | 'create'>('communities');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCall, setActiveCall] = useState<{ channelId: string; participants: any[] } | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'audio' | 'video' | 'appearance'>('audio');
  
  // Load persisted voice settings
  const currentUser = getCurrentUser();
  const vs = currentUser?.voiceSettings || {};
  const [inputVolume, setInputVolume] = useState(vs.inputVolume ?? 80);
  const [outputVolume, setOutputVolume] = useState(vs.outputVolume ?? 100);
  const [selectedMic, setSelectedMic] = useState(vs.selectedMic ?? 'default');
  const [selectedSpeaker, setSelectedSpeaker] = useState(vs.selectedSpeaker ?? 'default');
  const [communityTheme, setCommunityTheme] = useState<'classic' | 'modern' | 'glass'>(vs.communityTheme ?? 'classic');
  const [activeTab, setActiveTab] = useState<'hub' | 'create'>('hub');

  // Auto-save voice settings to backend
  useEffect(() => {
    if (!currentUser) return;
    const timeout = setTimeout(() => {
      updateVoiceSettings({
        inputVolume,
        outputVolume,
        selectedMic,
        selectedSpeaker,
        communityTheme
      }).catch(err => console.error('Failed to auto-save settings:', err));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [inputVolume, outputVolume, selectedMic, selectedSpeaker, communityTheme]);

  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['text-channels', 'voice-channels']);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [reportMessage, setReportMessage] = useState<{ id: string; author: string } | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const recordingStartRef = useRef<number>(0);


  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [voiceParticipants, setVoiceParticipants] = useState<any[]>([]);
  const [voicePresence, setVoicePresence] = useState<Record<string, any[]>>({});
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const isDeafenedRef = useRef(false);

  const [communities, setCommunities] = useState<ApiCommunity[]>([]);
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restrictedAccess, setRestrictedAccess] = useState(false);
  const [joinStatus, setJoinStatus] = useState<'idle' | 'pending'>('idle');
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const [channelRestricted, setChannelRestricted] = useState<ApiChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const mentionInputRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ApiMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const suggestedMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 5);
    return members.filter(m => (m.name || '').toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5);
  }, [members, mentionQuery]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m => 
      m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.userId?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  useEffect(() => {

    fetchCommunities();

    // Use the shared singleton socket — do NOT call io() here.
    // Multiple independent io() calls were causing competing connections
    // that closed each other immediately (the WebSocket flood bug).
    const socket = getSocket();
    socketRef.current = socket;

    const onVoiceSignal = ({ signal, from }: { signal: SignalData; from: string }) => {
      const peer = peersRef.current[from];
      if (peer) peer.signal(signal);
    };

    const onVoicePresenceUpdate = (payload: any) => {
      const channels = payload?.channels || {};
      setVoicePresence(channels);
    };

    const onUserJoinedVoice = ({ userId, name, avatar, socketId, channelId }: any) => {
      if (userId !== currentUser?._id) {
        const peer = createPeer(socketId, socket.id!, localStreamRef.current!);
        peersRef.current[socketId] = peer;
        setVoiceParticipants((prev) => {
          const next = [...prev, { userId, name, avatar, socketId, channelId }];
          return next.filter((p, idx, arr) => idx === arr.findIndex((x) => x.socketId === p.socketId));
        });
      }
    };

    const onUserLeftVoice = ({ socketId }: { socketId: string }) => {
      if (peersRef.current[socketId]) {
        peersRef.current[socketId].destroy();
        delete peersRef.current[socketId];
      }
      setVoiceParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    socket.on('voice_signal', onVoiceSignal);
    socket.on('voice_presence_update', onVoicePresenceUpdate);
    socket.on('user_joined_voice', onUserJoinedVoice);
    socket.on('user_left_voice', onUserLeftVoice);

    // Only remove OUR listeners — never disconnect the shared socket.
    return () => {
      socket.off('voice_signal', onVoiceSignal);
      socket.off('voice_presence_update', onVoicePresenceUpdate);
      socket.off('user_joined_voice', onUserJoinedVoice);
      socket.off('user_left_voice', onUserLeftVoice);
    };
  }, []);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !isMicMuted;
    });
  }, [isMicMuted]);

  useEffect(() => {
    isDeafenedRef.current = !!isDeafened;
    Object.values(audioElementsRef.current).forEach((a) => {
      try {
        a.muted = !!isDeafened;
        a.volume = isDeafened ? 0 : 1;
      } catch {
        // ignore
      }
    });
  }, [isDeafened]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream): Peer.Instance => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal: SignalData) => {
      socketRef.current?.emit('voice_signal', {
        to: userToSignal,
        from: callerId,
        signal,
      });
    });

    peer.on('stream', (stream: MediaStream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.muted = !!isDeafenedRef.current;
      audio.play().catch(() => {});
      audioElementsRef.current[userToSignal] = audio;
    });

    return peer;
  };

  const addPeer = (incomingSignal: SignalData, callerId: string, stream: MediaStream): Peer.Instance => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (signal: SignalData) => {
      socketRef.current?.emit('voice_signal', {
        to: callerId,
        signal,
      });
    });

    peer.on('stream', (stream: MediaStream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.muted = !!isDeafenedRef.current;
      audio.play().catch(() => {});
      audioElementsRef.current[callerId] = audio;
    });

    peer.signal(incomingSignal);
    return peer;
  };

  useEffect(() => {
    if (selectedCommunity) {
      fetchChannels(selectedCommunity._id);
      fetchMembers(selectedCommunity._id);
      setShowPinned(false);
      setPinnedMessages([]);

      socketRef.current?.emit('join_community', { communityId: selectedCommunity._id });
    }

    return () => {
      if (selectedCommunity?._id) {
        socketRef.current?.emit('leave_community', { communityId: selectedCommunity._id });
      }
    };
  }, [selectedCommunity]);

  useEffect(() => {
    if (selectedChannel && selectedChannel.type === 'text') {
      fetchMessages(selectedChannel._id);
    }
  }, [selectedChannel, selectedCommunity]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (emojiPickerRef.current?.contains(target)) return;
      setShowEmojiPicker(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onMouseDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onMouseDown);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!showMentionSuggestions) return;

    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (mentionDropdownRef.current?.contains(target)) return;
      if (mentionInputRef.current?.contains(target)) return;
      setShowMentionSuggestions(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('touchstart', onMouseDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('touchstart', onMouseDown);
    };
  }, [showMentionSuggestions]);

  const toggleBriefcase = async (messageId: string) => {
    try {
      const res = await api.post(`/communities/messages/${messageId}/briefcase`);
      const { isSaved } = res.data;
      setMessages((prev) => prev.map((m) => {
        if (m._id !== messageId) return m;
        const currentSavedBy = m.savedBy || [];
        const userIdStr = String(currentUser?.id || currentUser?._id || '');
        const nextSavedBy = isSaved
          ? [...currentSavedBy, userIdStr]
          : currentSavedBy.filter(id => id !== userIdStr);
        return { ...m, savedBy: nextSavedBy };
      }));
      toast.success(isSaved ? 'Saved to briefcase' : 'Removed from briefcase');
    } catch {
      toast.error('Failed to toggle briefcase');
    }
  };

  useEffect(() => {
    if (initialCommunityId && communities.length > 0) {
      const target = communities.find(c => c._id === initialCommunityId || (c as any).id === initialCommunityId);
      if (target) {
        setSelectedCommunity(target);
        if (!selectedChannel && window.innerWidth < 1024) {
          setMobileView('channels');
        }
      }
    }
  }, [initialCommunityId, communities]);

  useEffect(() => {
    const hashSplit = window.location.hash.split('?');
    if (hashSplit.length > 1 && messages.length > 0) {
      const urlParams = new URLSearchParams(hashSplit[1]);
      const targetMessageId = urlParams.get('message');
      if (targetMessageId && targetMessageId !== highlightedMessageId) {
        setHighlightedMessageId(targetMessageId);
        setTimeout(() => {
          const el = document.getElementById(`msg-${targetMessageId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => setHighlightedMessageId(null), 3500);
          }
        }, 300);
      }
    }
  }, [messages, window.location.hash]);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/communities');
      setCommunities(res.data || []);
      setError('');
    } catch (err: any) {
      setError('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const visibleCommunities = useMemo(() => {
    const me = String(userId || '');
    
    return (communities || []).filter((c) => {

      const visibility = String((c as any)?.settings?.visibility || 'public');

      // Show if user is creator, member, or admin
      const isCreator = String((c as any).creator || '') === me;
      const members = Array.isArray(c.members) ? c.members.map(String) : [];
      const admins = Array.isArray((c as any).admins) ? (c as any).admins.map(String) : [];
      
      if (isCreator || members.includes(me) || admins.includes(me)) return true;

      // Show public communities
      return visibility === 'public';
    });
  }, [communities, userId]);

  const fetchPinned = async (channelId: string) => {
    setLoadingPinned(true);
    try {
      const res = await api.get(`/communities/channels/${channelId}/pinned`);
      setPinnedMessages(res.data || []);
    } catch {
      setPinnedMessages([]);
    } finally {
      setLoadingPinned(false);
    }
  };

  const togglePin = async (messageId: string) => {
    try {
      const res = await api.post(`/communities/messages/${messageId}/toggle-pin`);
      const updated = res.data;
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
      if (showPinned && selectedChannel?._id) {
        await fetchPinned(selectedChannel._id);
      }
    } catch {
      setError('Failed to pin message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/communities/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      toast.success('Message deleted');
    } catch {
      toast.error('Failed to delete message');
    }
  };

  const loadCommunitySettings = async (communityId: string) => {
    try {
      const res = await api.get(`/communities/${communityId}/settings`);
      setCommunitySettings(res.data || {});
    } catch {
      setCommunitySettings(null);
    }
  };

  const saveCommunitySettings = async () => {
    if (!selectedCommunity) return;
    try {
      setSavingCommunitySettings(true);
      await api.put(`/communities/${selectedCommunity._id}/settings`, {
        settings: communitySettings?.settings || {},
      });
      setShowCommunityAdmin(false);
      await fetchCommunities();
    } catch {
      setError('Failed to save community settings');
    } finally {
      setSavingCommunitySettings(false);
    }
  };

  const fetchChannels = async (communityId: string) => {
    try {
      const res = await api.get(`/communities/${communityId}/channels`);
      setRestrictedAccess(false);
      setChannelRestricted(null);
      const channelsData = res.data || [];
      setChannels(channelsData);

      const hashSplit = window.location.hash.split('?');
      let targetChannel = null;
      if (hashSplit.length > 1) {
        const urlParams = new URLSearchParams(hashSplit[1]);
        const targetChannelId = urlParams.get('channel');
        if (targetChannelId) {
          targetChannel = channelsData.find((c: any) => c._id === targetChannelId || c.id === targetChannelId);
        }
      }

      if (targetChannel) {
        if (!selectedChannel || selectedChannel._id !== targetChannel._id) {
          setSelectedChannel(targetChannel);
          if (window.innerWidth < 1024) {
            setMobileView('chat');
          }
        }
      } else if (!selectedChannel && channelsData.length > 0) {
        const firstText = channelsData.find((c: any) => c.type === 'text');
        if (firstText) setSelectedChannel(firstText);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setRestrictedAccess(true);
      }
      setChannels([]);
    }
  };

  const getCommunityJoinMode = (community: ApiCommunity | null) => {
    const visibility = String(community?.settings?.visibility || 'public');
    const joinPolicy = String(community?.settings?.joinPolicy || 'open');
    const isOpen = visibility === 'public' && joinPolicy === 'open';
    return { visibility, joinPolicy, isOpen };
  };

  const handleJoinCommunityNow = async () => {
    if (!selectedCommunity) return;
    try {
      await api.post(`/communities/${selectedCommunity._id}/join`);
      setRestrictedAccess(false);
      await fetchChannels(selectedCommunity._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestJoin = async () => {
    if (!selectedCommunity) return;
    try {
      setJoinStatus('pending');
      const res = await api.post(`/communities/${selectedCommunity._id}/request-join`);
      if (res?.data?.status === 'member') {
        // Open community: backend joined us immediately
        setRestrictedAccess(false);
        await fetchChannels(selectedCommunity._id);
        return;
      }
      // Update local state so button says Pending
      const currentId = currentUser?.id || currentUser?._id;
      if (currentId) {
        setSelectedCommunity(prev => prev ? { ...prev, pendingMembers: [...(prev.pendingMembers || []), currentId] } : null);
      }
    } catch {
       setJoinStatus('idle');
    }
  };

  const handleSelectChannel = (channel: ApiChannel) => {
    if (channel?.restricted) {
      setChannelRestricted(channel);
      setSelectedChannel(null);
      return;
    }
    setChannelRestricted(null);
    setSelectedChannel(channel);
    setReplyingTo(null);
    if (window.innerWidth < 1024) {
      setMobileView('chat');
    }
  };

  const handleRequestChannelAccess = async () => {
    if (!selectedCommunity || !channelRestricted) return;
    try {
      await api.post(`/communities/channels/${channelRestricted._id}/request-join`);
      setChannelRestricted({
        ...channelRestricted,
        pending: true,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinAction = async (userId: string, action: 'approve' | 'deny') => {
    if (!selectedCommunity) return;
    try {
      await api.post(`/communities/${selectedCommunity._id}/requests/handle`, { userId, action });
      // Remove from local state
      setCommunitySettings((prev: any) => ({
        ...prev,
        pendingMembers: prev?.pendingMembers?.filter((id: string) => id !== userId)
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (channelId: string) => {
    if (!selectedCommunity) return;
    try {
      const res = await api.get(`/communities/${selectedCommunity._id}/channels/${channelId}/messages`);
      setMessages(res.data || []);
    } catch {
      setMessages([]);
    }
  };

  const fetchMembers = async (communityId: string) => {
    try {
      const res = await api.get(`/communities/${communityId}/members`);
      setMembers(res.data || []);
    } catch {
      setMembers([]);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredMembers = useMemo(() => {
    // Copy before sorting — Array.sort mutates, and `members` is React state.
    return [...members].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members]);

  const handleSendMessage = async () => {
    if (!currentUser) {
      window.location.hash = '#signup';
      return;
    }
    if (!messageInput.trim() || !selectedChannel || !selectedCommunity) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      const res = await api.post(`/communities/${selectedCommunity._id}/channels/${selectedChannel._id}/messages`, {
        content,
        replyTo: replyingTo ? {
          _id: replyingTo._id,
          content: replyingTo.content,
          userId: { name: replyingTo.userId?.name || 'Unknown' }
        } : undefined
      });
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        toast.success('Message sent');
      }
      setReplyingTo(null);
    } catch {
      toast.error('Failed to send message');
      setMessageInput(content);
    }
  };

  const handleJoinVoice = async (channel: ApiChannel) => {
    if (!currentUser) {
      window.location.hash = '#signup';
      return;
    }
    if (!selectedCommunity) return;
    toast.loading('Connecting to voice lounge...', { id: 'voice-connect' });
    try {
      if (activeCall?.channelId && activeCall.channelId !== channel._id) {
        handleLeaveCall();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      setIsMicMuted(false);
      setIsDeafened(false);

      setSelectedChannel(channel);
      setActiveCall({ channelId: channel._id, participants: [currentUser] });

      setVoiceParticipants([]);

      socketRef.current?.emit('join_voice', {
        channelId: channel._id,
        communityId: selectedCommunity._id,
        userId: currentUser?._id,
        name: currentUser?.name,
        avatar: currentUser?.avatar
      });
      toast.success('Connected to ' + channel.name, { id: 'voice-connect' });
    } catch (err: any) {
      const isPermissionDenied = 
        err?.name === 'NotAllowedError' || 
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission denied');
      
      if (isPermissionDenied) {
        requestMicrophonePermission();
      } else {
        toast.error('Microphone access denied', { id: 'voice-connect' });
      }
      
      const msg = 'Could not access microphone. Please check your browser permissions.';
      setError(msg);
    }
  };

  const handleLeaveCall = () => {
    if (activeCall) {
      toast.info('Left voice lounge');
      socketRef.current?.emit('leave_voice', {
        channelId: activeCall.channelId,
        communityId: selectedCommunity?._id,
        userId: currentUser?._id
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      Object.values(audioElementsRef.current).forEach((a) => {
        try {
          a.pause();
        } catch {
          // ignore
        }
      });
      audioElementsRef.current = {};

      Object.values(peersRef.current).forEach(peer => peer.destroy());
      peersRef.current = {};
      setVoiceParticipants([]);
      setActiveCall(null);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Pick a supported mime type
      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = mimeCandidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Clear timer
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        setRecordingDuration(0);

        stream.getTracks().forEach(track => track.stop());

        // Only send if we have data (not cancelled)
        if (chunks.length > 0) {
          const finalMime = recorder.mimeType || 'audio/webm';
          const ext = finalMime.includes('ogg') ? 'ogg' : finalMime.includes('mp4') ? 'm4a' : 'webm';
          const audioBlob = new Blob(chunks, { type: finalMime });
          await sendAudioMessage(audioBlob, ext);
        }
      };

      setMediaRecorder(recorder);
      setAudioChunks([]);
      recorder.start();
      setIsRecording(true);

      // Start duration timer
      recordingStartRef.current = Date.now();
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
      }, 500);
    } catch (err) {
      setError('Could not access microphone. Please allow mic permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      // Clear all chunks before stopping so onstop won't send
      mediaRecorder.ondataavailable = () => {};
      mediaRecorder.onstop = () => {
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        setRecordingDuration(0);
        // Stop mic stream
        mediaRecorder.stream?.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const formatRecordingDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sendAudioMessage = async (blob: Blob, ext = 'webm') => {
    if (!selectedChannel || !selectedCommunity) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', blob, `voice-message.${ext}`);
      formData.append('type', 'audio');

      const res = await api.post(`/communities/channels/${selectedChannel._id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        // Scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
      setError('');
    } catch (err) {
      setError('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  };

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'moderator':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'founder':
        return <Rocket className="w-3 h-3 text-blue-500" />;
      case 'expert':
        return <Handshake className="w-3 h-3 text-purple-500" />;
      case 'investor':
        return <Briefcase className="w-3 h-3 text-green-500" />;
      default:
        return null;
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const onlineMemberCount = members.length;

  const offlineMemberCount = 0;

  const currentChannels: ApiChannel[] = selectedCommunity ? channels : [];

  const isCommunityAdmin = (() => {
    const me = String((currentUser as any)?._id || (currentUser as any)?.id || '');
    const comm: any = selectedCommunity as any;
    if (!me || !comm) return false;
    if (String(comm.creator || '') === me) return true;
    const admins = Array.isArray(comm.admins) ? comm.admins.map(String) : [];
    return admins.includes(me);
  })();

  const voiceParticipantsByChannel = voiceParticipants.reduce((acc: Record<string, any[]>, p: any) => {
    const cid = String(p?.channelId || activeCall?.channelId || '');
    if (!cid) return acc;
    acc[cid] = acc[cid] || [];
    acc[cid].push(p);
    return acc;
  }, {});

  const voicePresenceByChannel = voicePresence || {};

  const handleUploadAttachments = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedChannel) return;

    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));

      await api.post(`/communities/channels/${selectedChannel._id}/attachments`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchMessages(selectedChannel._id);
      setError('');
    } catch (err) {
      setError('Failed to upload attachments');
    } finally {
      setUploading(false);
    }
  };

  const getPostSnapshotElementId = (messageId: string) => `shared-post-${messageId}`;

  const downloadSharedPostPng = async (messageId: string) => {
    const el = document.getElementById(getPostSnapshotElementId(messageId));
    if (!el) return;

    const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#ffffff', scale: 2 });
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `shared-post-${messageId}.png`;
    link.click();
  };

  const downloadSharedPostPdf = async (messageId: string) => {
    const el = document.getElementById(getPostSnapshotElementId(messageId));
    if (!el) return;

    const canvas = await html2canvas(el as HTMLElement, { backgroundColor: '#ffffff', scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: canvas.width >= canvas.height ? 'l' : 'p',
      unit: 'pt',
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`shared-post-${messageId}.pdf`);
  };

  const renderMobileCommunitiesList = () => (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">Communities</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleCommunities.map((community) => (
          <motion.div
            key={community._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              setSelectedCommunity(community);
              setMobileView('channels');
            }}
            className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl active:scale-[0.98] transition-all border border-gray-100 shadow-sm"
          >
            <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-2xl shadow-inner">
              {getCommunityIcon(community.name, community.icon)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{community.name}</h3>
              <p className="text-xs text-gray-500 truncate">{community.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded-md flex items-center gap-1">
                  <Users className="w-3 h-3" /> {community.memberCount}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </motion.div>
        ))}
        
        {/* Create Your Space button - temporarily disabled until we reach target user count */}
        {/* <button
          onClick={() => { setActiveTab('create'); setMobileView('create'); }}
          className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
            <Plus className="w-7 h-7" />
          </div>
          <span className="font-bold">Create Your Space</span>
        </button> */}
      </div>
    </div>
  );
  const renderMobileChannelsList = () => (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileView('communities')} className="p-1 -ml-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCommunityIcon(selectedCommunity?.name, selectedCommunity?.icon)}</span>
            <h1 className="text-lg font-bold truncate max-w-[120px]">{selectedCommunity?.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Text Channels</h3>
          <div className="space-y-1">
            {currentChannels.filter(c => c.type === 'text').map((channel) => (
              <motion.div
                key={channel._id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedChannel(channel);
                  setMobileView('chat');
                  fetchMessages(channel._id);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedChannel?._id === channel._id ? 'bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100' : 'text-gray-600 active:bg-gray-100'
                }`}
              >
                <Hash className={`w-5 h-5 ${selectedChannel?._id === channel._id ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="font-bold flex-1">{channel.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Voice Lounge</h3>
          <div className="space-y-1">
            {currentChannels.filter(c => c.type === 'voice').map((channel) => {
              const isActive = activeCall?.channelId === channel._id;
              const participants = (voicePresenceByChannel as any)[channel._id] || [];
              return (
                <motion.div
                  key={channel._id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleJoinVoice(channel)}
                  className={`p-3 rounded-xl transition-all border ${
                    isActive ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'text-gray-600 border-transparent active:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-bold block ${isActive ? 'text-emerald-700' : ''}`}>{channel.name}</span>
                      {participants.length > 0 && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
                          {participants.length} Active in Lounge
                        </p>
                      )}
                    </div>
                    {isActive ? (
                      <div className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg animate-pulse uppercase shadow-sm">Connected</div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileChatView = () => (
    <div className="h-full w-full bg-white flex flex-col relative min-h-0 flex-1">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileView('channels')} className="p-1 -ml-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <h1 className="font-bold truncate text-gray-900">{selectedChannel?.name}</h1>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              {onlineMemberCount} Online · {members.length} Total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            {isMuted ? <BellOff className="w-5 h-5 text-gray-400" /> : <Bell className="w-5 h-5 text-gray-600" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 grayscale opacity-40">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-sm font-bold">No messages here yet</p>
            <p className="text-xs">Start the conversation below!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Fragment key={message._id}>{renderMessage(message, true)}</Fragment>
          ))
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* FIXED INPUT AREA - Using a simple stable key to prevent re-mount focus issues */}
      <div className="border-t border-gray-200 bg-white p-3 pb-8 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]" key="mobile-chat-input-container">
        {replyingTo && (
          <div className="mb-2 px-3 py-2 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 truncate opacity-80">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-indigo-700">Replying to {replyingTo.userId?.name}</span>
              <span className="text-xs text-gray-500 truncate">{replyingTo.content}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full shrink-0 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {isRecording ? (
          /* ── WhatsApp-style Recording Overlay ── */
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            {/* Cancel button */}
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 hover:bg-red-100 rounded-xl transition-colors text-red-400 hover:text-red-600 flex-shrink-0"
              title="Cancel recording"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Recording indicator */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              <span className="text-sm font-bold text-red-600 tabular-nums">
                {formatRecordingDuration(recordingDuration)}
              </span>
              <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-300 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 16 + 4}px`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${0.3 + Math.random() * 0.4}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={stopRecording}
              className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex-shrink-0"
              title="Send voice message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* ── Normal Input ── */
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 relative">
              <input
                type="file"
                multiple
                className="hidden"
                id="mobile-community-attach"
                onChange={(e) => {
                  handleUploadAttachments(e.target.files);
                  e.currentTarget.value = '';
                }}
                disabled={uploading}
              />
              {/* Mention Suggestions Popup for Mobile */}
              <AnimatePresence>
                {showMentionSuggestions && suggestedMembers.length > 0 && (
                  <motion.div
                    ref={mentionDropdownRef}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 w-[calc(100vw-2rem)] max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-[70]"
                  >
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Members matching '{mentionQuery}'
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {suggestedMembers.map((m, idx) => (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => {
                            const newValue = messageInput.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, ` @${m.name} `);
                            setMessageInput(newValue);
                            setShowMentionSuggestions(false);
                            mentionInputRef.current?.focus();
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                            idx === mentionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden flex-shrink-0 relative">
                            <span className="absolute inset-0 flex items-center justify-center">
                              {m.name.charAt(0).toUpperCase()}
                            </span>
                            {m.avatar && (
                              <img 
                                src={m.avatar.startsWith('http') || m.avatar.startsWith('data:') ? m.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${m.avatar.startsWith('/') ? '' : '/'}${m.avatar}`} 
                                alt="" 
                                className="w-full h-full object-cover absolute inset-0 z-10"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            )}
                          </div>
                          <span className="font-bold text-sm truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <textarea name="textarea-bd8102"
                ref={mentionInputRef}
                key="mobile-textarea-input"
                value={messageInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setMessageInput(val);
                  const match = val.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
                  if (match) {
                    setMentionQuery(match[1]);
                    setShowMentionSuggestions(true);
                    setMentionIndex(0);
                  } else {
                    setShowMentionSuggestions(false);
                  }
                }}
                placeholder={`Message #${selectedChannel?.name || 'channel'}`}
                className="w-full px-4 py-3 pr-24 bg-gray-50 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-100 text-[15px] font-medium leading-relaxed"
                rows={1}
                onKeyDown={(e) => {
                  if (showMentionSuggestions && suggestedMembers.length > 0) {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMentionIndex((prev) => (prev > 0 ? prev - 1 : suggestedMembers.length - 1));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMentionIndex((prev) => (prev < suggestedMembers.length - 1 ? prev + 1 : 0));
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      const member = suggestedMembers[mentionIndex];
                      const newValue = messageInput.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, ` @${member.name} `);
                      setMessageInput(newValue);
                      setShowMentionSuggestions(false);
                      mentionInputRef.current?.focus();
                    } else if (e.key === 'Escape') {
                      setShowMentionSuggestions(false);
                    }
                  } else {
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSendMessage(); 
                    }
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                <button 
                  type="button"
                  onClick={startRecording}
                  className="p-2 rounded-xl transition-all hover:bg-gray-200 text-gray-400"
                  title="Record voice message"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
                  onClick={() => {
                    const inputEl = document.getElementById('mobile-community-attach');
                    if (inputEl) {
                      inputEl.click();
                    }
                  }}
                  disabled={uploading}
                  title={uploading ? 'Uploading...' : 'Attach'}
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || uploading}
              className={`p-3.5 rounded-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:grayscale flex-shrink-0 ${!messageInput.trim() ? 'bg-gray-400' : ''}`}
              style={messageInput.trim() ? { background: `linear-gradient(135deg, ${brandColors.electricBlue}, ${brandColors.atomicOrange})` } : {}}
            >
              {uploading ? <Sparkles className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      {activeCall && (
        <div className="absolute top-16 left-4 right-4 bg-emerald-600 text-white rounded-2xl p-4 shadow-2xl z-[70] flex items-center justify-between border border-emerald-500/30 backdrop-blur-md bg-emerald-600/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">In Lounge Call</p>
              <p className="text-sm font-bold mt-0.5">#{channels.find(c => c._id === activeCall.channelId)?.name || 'Voice Chat'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMicMuted(!isMicMuted)}
              className={`p-2 rounded-xl transition-all ${isMicMuted ? 'bg-red-500 shadow-md' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleLeaveCall}
              className="p-2 bg-red-500 rounded-xl shadow-lg active:scale-90 transition-all hover:bg-red-600"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderMessage = (message: ApiMessage, isMobile = false) => {
    if (message.type === 'system') {
      return (
        <div className="text-center text-sm text-gray-500 italic py-2">
          {message.content}
        </div>
      );
    }

    if ((message as any).type === 'shared-post' && (message as any).sharedPostId) {
      const shared = (message as any).sharedPostId;
      return (
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-900">Shared Post</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadSharedPostPng(message._id)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Download PNG
              </button>
              <button
                onClick={() => downloadSharedPostPdf(message._id)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Download PDF
              </button>
            </div>
          </div>

          <div id={getPostSnapshotElementId(message._id)} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
            <div className="text-sm font-bold text-gray-900 mb-1">{shared?.author?.name || 'Unknown'}</div>
            <div className="text-xs text-gray-600 mb-3">{shared?.author?.role || ''}</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{shared?.content || ''}</div>
            {shared?.image && (
              <img src={shared.image} alt="Shared" className="mt-3 rounded-lg max-h-64 object-cover" />
            )}
          </div>

          {message.content ? (
            <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{message.content}</div>
          ) : null}
        </div>
      );
    }

    if (message.type === 'milestone') {
      return (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl w-10 h-10 flex items-center justify-center overflow-hidden">
              {message.userId?.avatar
                ? <img src={message.userId.avatar.startsWith('http') || message.userId.avatar.startsWith('data:') ? message.userId.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${message.userId.avatar.startsWith('/') ? '' : '/'}${message.userId.avatar}`} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : '👤'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span className="font-bold flex items-center gap-1">
                  {message.userId?.name || 'Unknown'}
                  {message.userId?.isVerified && (
                    <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </span>
                <span className="text-xs text-gray-500">{formatTimestamp(message.createdAt)}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <p className="font-medium text-lg mb-1">{message.milestoneData?.title}</p>
                <p className="text-gray-700">{message.milestoneData?.description}</p>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (message.type === 'poll') {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="text-2xl w-8 h-8 flex items-center justify-center overflow-hidden">
              {message.userId?.avatar
                ? <img src={message.userId.avatar.startsWith('http') || message.userId.avatar.startsWith('data:') ? message.userId.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${message.userId.avatar.startsWith('/') ? '' : '/'}${message.userId.avatar}`} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : '👤'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm flex items-center gap-1">
                  {message.userId?.name || 'Unknown'}
                  {message.userId?.isVerified && (
                    <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </span>
                <span className="text-xs text-gray-500">{formatTimestamp(message.createdAt)}</span>
                {message.pinned && <Pin className="w-3 h-3 text-yellow-600" />}
              </div>
              <p className="text-xs text-gray-600 mb-2">{message.userId?.role || ''}</p>
              <p className="text-sm text-gray-900 break-words">{message.content}</p>

              {!!message.attachments?.length && (
                <div className="mt-2 flex flex-col gap-2">
                  {message.attachments.map((a, idx) => (
                    <a
                      key={idx}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-between gap-3 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <span className="text-xs font-bold text-gray-800 truncate">{a.originalName}</span>
                      <span className="text-xs text-gray-600">Download</span>
                    </a>
                  ))}
                </div>
              )}

              {message.reactions && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {message.reactions.map((reaction, idx) => (
                    <button
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <span className="text-sm">{reaction.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{reaction.count}</span>
                    </button>
                  ))}
                  <button className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              {message.threadCount && (
                <button className="flex items-center gap-2 mt-2 text-xs text-blue-600 hover:underline">
                  <MessageSquare className="w-3 h-3" />
                  {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
                </button>
              )}
            </div>

            {!isMobile && (
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                <button className="p-1.5 hover:bg-gray-200 rounded" title="React">
                  <Smile className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-1.5 hover:bg-gray-200 rounded" title="Reply" onClick={() => setReplyingTo(message)}>
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                </button>

                <button className="p-1.5 hover:bg-gray-200 rounded" title="More">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (message.type === 'audio') {
      return (
        <div 
          id={`msg-${message._id}`}
          className={`group relative flex gap-4 ${isMobile ? '' : 'px-4 py-2 hover:bg-black/[0.02] rounded-lg'} transition-all duration-300 ${highlightedMessageId === message._id ? 'bg-indigo-50 ring-2 ring-indigo-400/50 shadow-md transform scale-[1.01] z-10' : ''}`}
        >
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 flex items-center justify-center text-sm font-bold text-dc-indigo shadow-sm border border-dc-indigo/10 relative overflow-hidden">
              <span className="absolute inset-0 flex items-center justify-center">
                {(message.userId?.name || 'U').charAt(0).toUpperCase()}
              </span>
              {message.userId?.avatar && (
                <img 
                  src={message.userId.avatar.startsWith('http') || message.userId.avatar.startsWith('data:') ? message.userId.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${message.userId.avatar.startsWith('/') ? '' : '/'}${message.userId.avatar}`} 
                  alt="" 
                  className="w-full h-full rounded-xl object-cover absolute inset-0 z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-[15px] text-dc-text-header hover:underline cursor-pointer flex items-center gap-1">
                {message.userId?.name || 'Unknown'}
                {message.userId?.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </span>
              <span className="text-[11px] font-medium text-dc-text-muted uppercase tracking-tight bg-black/[0.04] px-1.5 py-0.5 rounded">
                {message.userId?.role || 'Member'}
              </span>
              <span className="text-[11px] text-dc-text-muted font-medium">
                {formatTimestamp(message.createdAt)}
              </span>
              {message.pinned && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 rounded text-yellow-600">
                  <Pin className="w-3 h-3" />
                  <span className="text-[10px] font-bold">PINNED</span>
                </div>
              )}
            </div>
            <AudioMessagePlayer src={message.attachments?.[0]?.url || ''} />
          </div>
        </div>
      );
    }

    return (
      <div 
        id={`msg-${message._id}`}
        className={`group relative flex gap-4 ${isMobile ? '' : 'px-4 py-2 hover:bg-black/[0.02] rounded-lg'} transition-all duration-300 ${highlightedMessageId === message._id ? 'bg-indigo-50 ring-2 ring-indigo-400/50 shadow-md transform scale-[1.01] z-10' : ''}`}
        onContextMenu={isMobile ? (e) => { e.preventDefault(); setReplyingTo(message); mentionInputRef.current?.focus(); } : undefined}
      >
        {/* Action Toolbar — hover-reveal on desktop, always visible on touch so
            Reply/Pin/Delete/Report are reachable without a hover (touch devices
            can't hover; Report must be reachable for UGC moderation, Apple 1.2). */}
        {(
          <div className={`absolute top-1 right-2 ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150 z-20`}>
            <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              <button
                onClick={() => { setReplyingTo(message); mentionInputRef.current?.focus(); }}
                className="p-2 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 transition-colors"
                title="Reply"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => togglePin(message._id)}
                className={`p-2 transition-colors ${message.pinned ? 'bg-yellow-50 text-yellow-600' : 'hover:bg-yellow-50 text-gray-500 hover:text-yellow-600'}`}
                title={message.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-4 h-4" />
              </button>
              {(message.userId?._id === currentUser?._id || message.userId === currentUser?._id) && (
                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  title="Delete Message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {!(message.userId?._id === currentUser?._id || message.userId === currentUser?._id) && (
                <button
                  onClick={() => setReportMessage({ id: message._id, author: message.userId?.name || 'Unknown' })}
                  className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  title="Report Message"
                >
                  <Flag className="w-4 h-4" />
                </button>
              )}

            </div>
          </div>
        )}

        {/* Removed absolute mobile reply button, moved inline */}

        <div className="flex-shrink-0 mt-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 flex items-center justify-center text-sm font-bold text-dc-indigo shadow-sm border border-dc-indigo/10 relative overflow-hidden">
            <span className="absolute inset-0 flex items-center justify-center">
              {(message.userId?.name || 'U').charAt(0).toUpperCase()}
            </span>
            {message.userId?.avatar && (
              <img 
                src={message.userId.avatar.startsWith('http') || message.userId.avatar.startsWith('data:') ? message.userId.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${message.userId.avatar.startsWith('/') ? '' : '/'}${message.userId.avatar}`} 
                alt="" 
                className="w-full h-full rounded-xl object-cover absolute inset-0 z-10"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-[15px] text-dc-text-header hover:underline cursor-pointer flex items-center gap-1">
              {message.userId?.name || 'Unknown'}
              {message.userId?.isVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              )}
            </span>
            <span className="text-[11px] font-medium text-dc-text-muted uppercase tracking-tight bg-black/[0.04] px-1.5 py-0.5 rounded">
              {message.userId?.role || 'Member'}
            </span>
            <span className="text-[11px] text-dc-text-muted font-medium">
              {formatTimestamp(message.createdAt)}
            </span>
            {message.pinned && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 rounded text-yellow-600">
                <Pin className="w-3 h-3" />
                <span className="text-[10px] font-bold">PINNED</span>
              </div>
            )}
            {isMobile && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setReplyingTo(message); 
                  setTimeout(() => mentionInputRef.current?.focus(), 50); 
                }} 
                className="ml-auto flex shrink-0 p-1.5 bg-gray-50 text-gray-500 hover:text-indigo-600 active:bg-gray-200 rounded-md transition-all shadow-sm border border-gray-100"
                title="Reply"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
            {isMobile && (message.userId?._id === currentUser?._id || message.userId === currentUser?._id) && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleDeleteMessage(message._id); 
                }} 
                className="ml-1 flex shrink-0 p-1.5 bg-gray-50 text-gray-500 hover:text-red-600 active:bg-gray-200 rounded-md transition-all shadow-sm border border-gray-100"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {message.replyTo && (
            <div className="flex items-center gap-1.5 mb-1 text-xs text-dc-text-muted">
              <div className="w-4 h-4 border-l-2 border-t-2 border-gray-300 rounded-tl-lg mt-1 opacity-60"></div>
              <span className="font-bold text-gray-500 hover:underline cursor-pointer">@{message.replyTo.userId?.name}</span>
              <span className="truncate max-w-sm opacity-80">{message.replyTo.content}</span>
            </div>
          )}
          <p className="text-[14px] text-dc-text-normal break-words whitespace-pre-wrap leading-relaxed selection:bg-dc-indigo/10">
            {message.content}
          </p>

          {!!(message.attachments?.length || message.metadata?.attachments?.length) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
              {(message.attachments || message.metadata?.attachments || []).map((a, idx) => {
                const isImage = a.mimeType?.startsWith('image/');
                const apiBase = getSingletonApiBase(import.meta.env.VITE_API_URL).replace(/\/api$/, '');
                const url = a.url?.startsWith('http') || a.url?.startsWith('data:') ? a.url : `${apiBase}${a.url?.startsWith('/') ? '' : '/'}${a.url}`;
                return (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group/file block relative rounded-xl overflow-hidden border border-dc-border bg-black/[0.01] hover:bg-black/[0.03] transition-all cursor-pointer"
                  >
                    {isImage ? (
                      <img src={url} alt={a.originalName} className="w-full aspect-video object-cover" />
                    ) : (
                      <div className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-dc-indigo/5 flex items-center justify-center border border-dc-indigo/10">
                          <FileText className="w-5 h-5 text-dc-indigo" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-dc-text-header truncate group-hover/file:text-indigo-600 transition-colors">{a.originalName}</p>
                          <p className="text-[10px] text-dc-text-muted">{(a.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ─── CREATE COMMUNITY MODAL ─── */}
      {isCreateCommunityOpen && createPortal(
        <div className="fixed inset-0 bg-black/70 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { if (!isCreating) setIsCreateCommunityOpen(false); }}>
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto bg-white border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create a Community</h2>
              <p className="text-sm text-gray-500 mt-1">Your community is where you and your people hang out. Make yours and start building together.</p>
            </div>

            {/* Form */}
            <div className="px-6 pb-2 space-y-4">
              {/* Icon / Emoji */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300 hover:border-indigo-400">
                  <span className="text-3xl">{newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀'}</span>
                </div>
                <p className="text-xs text-gray-500">Community icon</p>
              </div>

              {/* Emoji quick-pick */}
              <div className="flex flex-wrap gap-2 justify-center">
                {['🚀', '💡', '🎯', '🌱', '💎', '⚡', '🔥', '🌍', '🤝', '🏆'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewCommunityDescription('emoji:' + emoji)}
                    className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all ${
                      newCommunityDescription === 'emoji:' + emoji ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Community Name <span className="text-red-500">*</span></label>
                <input name="input-d2fa5f"
                  type="text"
                  value={newCommunityName}
                  onChange={(e) => { setNewCommunityName(e.target.value); setCreateError(''); }}
                  placeholder="e.g. Startup Founders Hub"
                  maxLength={60}
                  className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-200 bg-gray-50"
                />
                <p className="text-[10px] text-gray-500 mt-1">By creating a community, you agree to our Community Guidelines.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea name="textarea-457724"
                  rows={2}
                  value={newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription}
                  onChange={(e) => setNewCommunityDescription(e.target.value)}
                  placeholder="What's this community about?"
                  className="w-full px-4 py-3 rounded-lg text-gray-900 placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-200 resize-none bg-gray-50"
                />
              </div>

              {/* Error message */}
              {createError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{createError}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => { if (isCreating) return; setIsCreateCommunityOpen(false); setNewCommunityName(''); setNewCommunityDescription(''); setCreateError(''); }}
                disabled={isCreating}
                className="flex-1 px-4 py-3 rounded-lg text-gray-600 font-semibold hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={async () => {
                  if (!newCommunityName.trim() || isCreating) return;
                  setIsCreating(true);
                  setCreateError('');
                  try {
                    const icon = newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀';
                    const description = newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription;
                    await api.post('/communities', { name: newCommunityName.trim(), description, icon });
                    setNewCommunityName('');
                    setNewCommunityDescription('');
                    setCreateError('');
                    setIsCreateCommunityOpen(false);
                    fetchCommunities();
                  } catch (err: any) {
                    const msg = err?.response?.data?.message || err?.message || 'Unknown error';
                    const isNetworkError = !err?.response;
                    setCreateError(
                      isNetworkError
                        ? 'Cannot connect to the server. Please make sure the backend is running.'
                        : `Failed to create community: ${msg}`
                    );
                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={!newCommunityName.trim() || isCreating}
                className="flex-1 px-4 py-3 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Creating...</>
                ) : 'Create Community'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {showPinned && selectedChannel && (
        <div className="fixed inset-0 bg-black/40 z-[55] flex" onClick={() => setShowPinned(false)}>
          <div className="ml-auto w-full max-w-md h-full bg-white shadow-2xl border-l border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200">
              <div>
                <div className="font-bold text-gray-900">Pinned messages</div>
                <div className="text-xs text-gray-500 truncate">#{selectedChannel.name}</div>
              </div>
              <button onClick={() => setShowPinned(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
              {loadingPinned ? (
                <div className="text-sm text-gray-500">Loading…</div>
              ) : pinnedMessages.length === 0 ? (
                <div className="text-sm text-gray-500">No pinned messages</div>
              ) : (
                <div className="space-y-3">
                  {pinnedMessages.map((m) => (
                    <div key={m._id} className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-800 truncate">{m.userId?.name || 'User'}</div>
                          <div className="text-[10px] text-gray-500">{formatTimestamp(m.createdAt)}</div>
                        </div>
                        <button
                          onClick={() => togglePin(m._id)}
                          className="p-2 hover:bg-gray-200 rounded-lg text-gray-700"
                          title="Unpin"
                        >
                          <Pin className="w-4 h-4 text-yellow-600" />
                        </button>
                      </div>
                      <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCommunityAdmin && selectedCommunity && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCommunityAdmin(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Community Admin</h2>
              <button onClick={() => setShowCommunityAdmin(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select name="select-e7f37a"
                  value={communitySettings?.settings?.visibility || 'public'}
                  onChange={(e) => setCommunitySettings((prev: any) => ({
                    ...(prev || {}),
                    settings: { ...(prev?.settings || {}), visibility: e.target.value },
                  }))}
                  className="w-full p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Policy</label>
                <select name="select-340c28"
                  value={communitySettings?.settings?.joinPolicy || 'open'}
                  onChange={(e) => setCommunitySettings((prev: any) => ({
                    ...(prev || {}),
                    settings: { ...(prev?.settings || {}), joinPolicy: e.target.value },
                  }))}
                  className="w-full p-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="open">Open to all</option>
                  <option value="invite">Invite only</option>
                </select>
              </div>
            </div>
            
            {communitySettings?.pendingMembers && communitySettings.pendingMembers.length > 0 && (
              <div className="px-5 pb-5">
                <h3 className="text-sm font-bold text-gray-900 mb-2 border-b border-gray-200 pb-2">Pending Join Requests ({communitySettings.pendingMembers.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {communitySettings.pendingMembers.map((userId: string) => (
                    <div key={userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs font-mono text-gray-600 truncate mr-2" title={userId}>User: {userId.slice(-6)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleJoinAction(userId, 'approve')} className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-500 transition-colors">Approve</button>
                        <button onClick={() => handleJoinAction(userId, 'deny')} className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded hover:bg-red-200 transition-colors">Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-5 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCommunityAdmin(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 text-gray-700"
                disabled={savingCommunitySettings}
              >
                Cancel
              </button>
              <button
                onClick={saveCommunitySettings}
                className="flex-1 px-4 py-3 rounded-xl text-white font-bold bg-gray-900 hover:bg-black disabled:opacity-50"
                disabled={savingCommunitySettings}
              >
                {savingCommunitySettings ? 'Saving...' : 'Save'}
              </button>
            </div>
          </motion.div>
        </div>
      )}



      {/* === DISCORD-STYLE LAYOUT — fills the parent container === */}
      <div className="lg:hidden h-full min-h-0 max-h-[100dvh] flex flex-col">
        {activeCall && (
          <div className="bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between shadow-lg z-50">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-2 h-2 bg-dc-green rounded-full animate-pulse shadow-[0_0_8px_rgba(35,165,90,0.8)] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Voice Connected</p>
                <p className="text-sm font-bold truncate mt-0.5">
                  {channels.find(c => c._id === activeCall.channelId)?.name || 'Voice Channel'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMicMuted(!isMicMuted)} 
                className={`p-2 rounded-lg transition-all ${isMicMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleLeaveCall} 
                className="p-2 bg-red-500 rounded-lg shadow-lg active:scale-90 transition-all ml-1"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {mobileView === 'communities' && renderMobileCommunitiesList()}
          {mobileView === 'channels' && renderMobileChannelsList()}
          {mobileView === 'chat' && renderMobileChatView()}
          {mobileView === 'create' && (
            <div className="h-full bg-white flex flex-col">
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-[60]">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobileView('communities')} className="p-1 -ml-1 hover:bg-gray-100 rounded-lg">
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                  </button>
                  <h1 className="text-lg font-bold">New Community</h1>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                       <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Start Your Hub</h1>
                 </div>

                 <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-4xl border border-indigo-100">
                          {newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀'}
                       </div>
                       <div className="flex flex-wrap gap-2 justify-center">
                          {['🚀', '💡', '🎯', '🌱', '💎', '⚡', '🔥', '🌍', '🤝', '🏆'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => setNewCommunityDescription('emoji:' + emoji)}
                              className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all ${
                                newCommunityDescription === 'emoji:' + emoji ? 'bg-indigo-600 ring-4 ring-indigo-100 scale-110' : 'bg-gray-50'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <input 
                         value={newCommunityName}
                         onChange={(e) => { setNewCommunityName(e.target.value); setCreateError(''); }}
                         className="w-full h-14 px-4 bg-gray-50 rounded-xl outline-none font-bold text-lg focus:ring-2 focus:ring-indigo-500 border border-gray-100"
                         placeholder="Community Name"
                       />
                       <textarea 
                         value={newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription}
                         onChange={(e) => setNewCommunityDescription(e.target.value)}
                         className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none font-medium h-32 focus:ring-2 focus:ring-indigo-500 border border-gray-100"
                         placeholder="Tell the world about your space..."
                       />
                       
                       {createError && <p className="text-xs text-red-600 font-bold px-1">{createError}</p>}
                       
                       <button
                          onClick={async () => {
                             if (!newCommunityName.trim() || isCreating) return;
                             setIsCreating(true);
                             try {
                               const icon = newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀';
                               const description = newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription;
                               const res = await api.post('/communities', { name: newCommunityName.trim(), description, icon });
                               setNewCommunityName('');
                               setNewCommunityDescription('');
                               await fetchCommunities();
                               setActiveTab('hub');
                               if (res.data) {
                                  setSelectedCommunity(res.data);
                                  setSelectedChannel(null);
                                  setMobileView('channels');
                               } else {
                                  setMobileView('communities');
                               }
                               toast.success('Launched! 🚀');
                             } catch (err: any) {
                               setCreateError(err?.response?.data?.message || 'Failed');
                             } finally {
                               setIsCreating(false);
                             }
                          }}
                          disabled={!newCommunityName.trim() || isCreating}
                          className="w-full h-14 bg-indigo-600 text-white rounded-xl font-bold text-lg active:scale-95 transition-all disabled:opacity-50"
                       >
                          {isCreating ? 'Spawning...' : 'Create Community'}
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === DISCORD-STYLE LAYOUT — fills the parent container === */}
      <div className="hidden lg:flex dc-bg-server h-full overflow-hidden">
        {/* SIDEBAR 1: GLOBAL SERVER HUB (80px) */}
        <aside className="w-[72px] dc-bg-server flex flex-col items-center py-3 gap-3 flex-shrink-0 relative border-r border-dc-border">
          
          {/* Back to Platform Button */}
          <div className="relative group/tip w-full flex justify-center mb-1">
            <button
              onClick={() => {
                setSelectedCommunity(null);
                setSelectedChannel(null);
                setActiveTab('hub');
              }}
              className="w-12 h-12 rounded-[24px] bg-white text-gray-700 hover:bg-gray-100 hover:rounded-[16px] flex items-center justify-center transition-all duration-300 shadow-sm border border-dc-border"
            >
              <Home className="w-6 h-6" />
            </button>
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl scale-95 group-hover/tip:scale-100 origin-left">
              Community Hub
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-black" />
            </div>
          </div>
          <div className="w-8 h-[2px] bg-dc-border rounded-full flex-shrink-0" />

          {/* Server List */}
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col items-center gap-3 w-full px-3 bg-white pt-2">
            {visibleCommunities.map((community) => (
              <div key={community._id} className="relative group/tip w-full flex justify-center">
                <button
                  onClick={() => { setSelectedCommunity(community); setSelectedChannel(null); setActiveTab('hub'); }}
                  className={`w-12 h-12 flex items-center justify-center transition-all duration-300 relative group/icon shadow-sm ${
                    selectedCommunity?._id === community._id
                      ? 'bg-blue-600 rounded-[16px] text-white shadow-xl shadow-blue-500/40 ring-2 ring-blue-600/20 ring-offset-2'
                      : 'bg-white text-dc-text-muted rounded-[24px] hover:bg-black/[0.04] hover:rounded-[16px] hover:text-dc-text-normal border border-dc-border hover:shadow-md hover:shadow-black/10'
                  }`}
                >
                  <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 bg-blue-600 rounded-r-full transition-all duration-300 ${
                    selectedCommunity?._id === community._id ? 'h-8 opacity-100' : 'h-2 opacity-0 group-hover/tip:opacity-100 group-hover/tip:h-5'
                  }`} />
                  <span className="text-xl font-black uppercase tracking-tighter">
                    {getCommunityIcon(community.name, community.icon)}
                  </span>
                  {(community.unreadCount ?? 0) > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full border-[4px] border-dc-bg-server flex items-center justify-center shadow-lg">
                      {community.unreadCount}
                    </div>
                  )}
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl scale-95 group-hover/tip:scale-100 origin-left">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase">{community.name}</span>
                    {community.memberCount > 0 && <span className="text-white/40 font-bold">· {community.memberCount}</span>}
                  </div>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-black" />
                </div>
              </div>
            ))}

            {/* Create Community button - temporarily disabled until target user count reached */}
          </div>
        </aside>

        {/* SIDEBAR 2: COMMUNITY CHANNELS OR CREATE OPTIONS */}
        <aside className="w-[240px] dc-bg-sidebar flex flex-col flex-shrink-0 border-r border-dc-border relative z-20">
          {activeTab === 'create' ? (
            <div className="flex-1 flex flex-col bg-white">
              <div className="h-12 px-4 flex items-center border-b border-dc-border">
                <h2 className="font-black text-[12px] text-dc-text-header uppercase tracking-wider">Creation Center</h2>
              </div>
              <div className="p-3 space-y-1">
                <button 
                  onClick={() => setActiveTab('create')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dc-indigo/10 text-dc-indigo font-bold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Community
                </button>
                <button 
                  onClick={() => { setActiveTab('hub'); setSelectedCommunity(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-dc-text-muted hover:bg-black/[0.03] hover:text-dc-text-normal font-bold text-sm transition-all"
                >
                  <Search className="w-4 h-4" />
                  Discover
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="h-12 px-4 flex items-center justify-between dc-border border-b shadow-sm cursor-pointer hover:bg-black/[0.02] transition-colors group relative"
                onClick={() => setShowCommunityDropdown((v) => !v)}
              >
                <h2 className="font-black truncate text-[13px] text-dc-text-header uppercase tracking-wider">
                  {selectedCommunity ? selectedCommunity.name : 'Select Hub'}
                </h2>
                <ChevronDown className="w-4 h-4 text-dc-text-muted group-hover:text-dc-text-header transition-colors" />

            {showCommunityDropdown && (
              <div
                className="absolute top-full left-2 right-2 mt-2 bg-white border border-dc-border rounded-xl shadow-2xl z-[80] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-72 overflow-y-auto no-scrollbar">
                  {visibleCommunities.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => {
                        setSelectedCommunity(c);
                        setSelectedChannel(null);
                        setActiveTab('hub');
                        setShowCommunityDropdown(false);
                      }}
                      className={`w-full px-3 py-2.5 flex items-center text-left text-sm font-bold transition-colors ${
                        selectedCommunity?._id === c._id ? 'bg-dc-indigo/10 text-dc-indigo' : 'hover:bg-black/[0.03] text-dc-text-header'
                      }`}
                    >
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center mr-2 text-base">{getCommunityIcon(c.name, c.icon)}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar py-4 px-2 bg-white">
            {selectedCommunity && !restrictedAccess ? (
              <div className="space-y-6">
                {/* Text Channels Category */}
                <div>
                  <button
                    onClick={() => toggleCategory('text-channels')}
                    className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-black text-dc-text-muted uppercase tracking-widest hover:text-dc-text-normal transition-colors group"
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedCategories.includes('text-channels') ? 'rotate-90' : ''}`} />
                    <span>Text Channels</span>
                    {userRole === 'expert' && <Plus className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                  {expandedCategories.includes('text-channels') && (
                    <div className="mt-1 space-y-0.5">
                      {currentChannels.filter((c) => c.type === 'text').map((channel) => (
                        <button
                          key={channel._id}
                          onClick={() => handleSelectChannel(channel)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${
                            selectedChannel?._id === channel._id
                              ? 'bg-dc-indigo/10 text-dc-indigo shadow-sm'
                              : 'text-dc-text-muted hover:bg-black/[0.03] hover:text-dc-text-normal'
                          }`}
                        >
                          <Hash className={`w-4 h-4 flex-shrink-0 ${
                            selectedChannel?._id === channel._id ? 'text-dc-indigo' : 'text-dc-text-muted opacity-50'
                          }`} />
                          <span className={`flex-1 text-[14px] truncate text-left ${selectedChannel?._id === channel._id ? 'font-bold' : 'font-medium'}`}>{channel.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {(channel.readOnly || channel.visibility === 'private') && <Lock className="w-3 h-3 text-dc-text-muted" />}
                            <UserPlus className="w-3.5 h-3.5 text-dc-text-muted hover:text-dc-text-header" />
                            <Settings className="w-3.5 h-3.5 text-dc-text-muted hover:text-dc-text-header" />
                          </div>
                          {(channel.unreadCount ?? 0) > 0 && (
                            <div className="min-w-[8px] h-[8px] bg-dc-indigo rounded-full flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Channels Category */}
                <div>
                  <button
                    onClick={() => toggleCategory('voice-channels')}
                    className="w-full flex items-center gap-1 px-2 py-1 text-[11px] font-black text-dc-text-muted uppercase tracking-widest hover:text-dc-text-normal transition-colors group"
                  >
                    <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expandedCategories.includes('voice-channels') ? 'rotate-90' : ''}`} />
                    <span>Voice Channels</span>
                    {userRole === 'expert' && <Plus className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                  {expandedCategories.includes('voice-channels') && (
                    <div className="mt-1 space-y-0.5">
                      {currentChannels.filter((c) => c.type === 'voice').map((channel) => {
                        const isActive = activeCall?.channelId === channel._id;
                        const participants = (voicePresenceByChannel as any)[channel._id] || [];
                        return (
                          <div key={channel._id}>
                            <button
                              onClick={() => handleJoinVoice(channel)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ${
                                isActive ? 'bg-dc-green/10 text-dc-green shadow-sm' : 'text-dc-text-muted hover:bg-black/[0.03] hover:text-dc-text-normal'
                              }`}
                            >
                              <Volume2 className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-dc-green' : 'text-dc-text-muted opacity-50'}`} />
                              <span className={`flex-1 text-[14px] truncate text-left ${isActive ? 'font-bold' : 'font-medium'}`}>{channel.name}</span>
                              {isActive && <div className="w-2 h-2 bg-dc-green rounded-full animate-pulse shadow-[0_0_8px_rgba(35,165,90,0.5)]" />}
                            </button>
                            {(isActive || participants.length > 0) && (
                              <div className="ml-8 mt-1 space-y-1 mb-2 pr-2">
                                {isActive && (
                                  <div className="flex items-center gap-2 py-1 px-2 rounded-md bg-black/[0.02] text-dc-text-header">
                                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] font-black shadow-lg text-white">
                                      {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-bold truncate flex-1">{currentUser?.name || 'You'}</span>
                                    <div className="flex items-center gap-1">
                                      {isMicMuted ? <MicOff className="w-3 h-3 text-dc-red" /> : <Mic className="w-3 h-3 text-dc-green" />}
                                    </div>
                                  </div>
                                )}
                                {participants.filter((p: any) => p.userId !== currentUser?._id).map((p: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 py-1 px-2 rounded-md hover:bg-black/[0.02] text-dc-text-normal transition-colors">
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-black">
                                      {(p.name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-[13px] font-medium truncate flex-1">{p.name || 'User'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedCommunity && restrictedAccess ? (
              <div className="px-4 py-8 flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-black/[0.02] border border-dc-border flex items-center justify-center shadow-lg">
                  <Lock className="w-7 h-7 text-dc-text-muted" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-dc-text-header uppercase tracking-tighter">Restricted Access</p>
                  <p className="text-[12px] text-dc-text-muted leading-relaxed">
                    You need to be a member to view channels, read messages, and participate in this community.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-4 py-10 flex flex-col items-center gap-5 text-center">
                <div className="w-16 h-16 rounded-3xl bg-dc-indigo/10 flex items-center justify-center border border-dc-indigo/20 shadow-2xl animate-pulse">
                  <Sparkles className="w-8 h-8 text-dc-indigo" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-dc-text-muted uppercase tracking-widest leading-relaxed">
                    Select a community to begin
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="group flex items-center gap-2 mx-auto text-[13px] text-indigo-600 hover:text-indigo-800 font-black transition-all px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100"
                  >
                    <FolderPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Create New</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* USER PROFILE SECTION */}
          <div className="p-2 dc-bg-userpanel border-t border-dc-border flex flex-col gap-2">
            {activeCall && (
              <div className="bg-white rounded-xl p-3 border border-dc-border shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-dc-green rounded-full animate-ping" />
                      <span className="text-[10px] font-black text-dc-green uppercase tracking-widest">Voice Connected</span>
                    </div>
                    <span className="text-[12px] text-dc-text-header truncate font-bold mt-0.5">
                      {channels.find((c) => c._id === activeCall.channelId)?.name}
                    </span>
                  </div>
                  <button 
                    onClick={handleLeaveCall} 
                    className="p-2 bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white rounded-xl transition-all active:scale-90"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setIsMicMuted(!isMicMuted)} 
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[11px] ${
                      isMicMuted ? 'bg-red-600 text-white' : 'bg-black/[0.03] text-dc-text-normal hover:bg-black/[0.06]'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    {isMicMuted ? 'UNMUTE' : 'MUTE'}
                  </button>
                  <button 
                    onClick={() => setIsDeafened(!isDeafened)} 
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[11px] ${
                      isDeafened ? 'bg-red-600 text-white' : 'bg-black/[0.03] text-dc-text-normal hover:bg-black/[0.06]'
                    }`}
                  >
                    {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {isDeafened ? 'UNDEAFEN' : 'DEAFEN'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-black/[0.03] transition-colors group">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white shadow-lg overflow-hidden border border-dc-border">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (currentUser?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-dc-green border-[2.5px] border-dc-bg-userpanel rounded-full shadow-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-black truncate text-dc-text-header tracking-tight leading-none">
                  {currentUser?.name || 'Explorer'}
                </p>
                <p className="text-[10px] text-dc-text-muted truncate font-bold mt-1 tracking-widest opacity-60">
                  ONLINE
                </p>
              </div>
              <div className="flex items-center">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-1.5 text-dc-text-muted hover:text-dc-indigo hover:bg-dc-indigo/10 rounded-lg transition-all"
                  title="Voice Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>

        {/* COLUMN 3: MAIN CHAT CONTENT */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 dc-bg-chat relative overflow-hidden">
          {activeTab === 'create' ? (
            <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-12">
                  <div className="max-w-2xl mx-auto space-y-8 md:y-12">
                     <div className="text-center space-y-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 animate-bounce-slow">
                           <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">Create Your Digital Space</h1>
                        <p className="text-gray-500 text-base md:text-lg font-medium max-w-lg mx-auto leading-relaxed">Your community is the heartbeat of collaboration. Design a hub where your vision comes to life.</p>
                     </div>

                     <div className="bg-white border-2 border-gray-100 rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl shadow-gray-100/50 space-y-8 relative overflow-hidden group hover:border-indigo-100 transition-colors">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000 hidden md:block">
                           <Rocket className="w-64 h-64 text-indigo-600" />
                        </div>

                        <div className="space-y-6 relative">
                           <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl shadow-inner cursor-pointer hover:bg-indigo-100 transition-colors border border-indigo-100 shrink-0">
                                 <span>{newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀'}</span>
                              </div>
                              <div className="flex-1 w-full">
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 text-center md:text-left">Pick an Identity</label>
                                 <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                   {['🚀', '💡', '🎯', '🌱', '💎', '⚡', '🔥', '🌍', '🤝', '🏆'].map((emoji) => (
                                     <button
                                       key={emoji}
                                       onClick={() => setNewCommunityDescription('emoji:' + emoji)}
                                       className={`w-9 h-9 md:w-10 md:h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                                         newCommunityDescription === 'emoji:' + emoji ? 'bg-indigo-600 text-white shadow-xl scale-110 ring-4 ring-indigo-100' : 'bg-gray-50 hover:bg-gray-100'
                                       }`}
                                     >
                                       {emoji}
                                     </button>
                                   ))}
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Community Name</label>
                              <input 
                                 value={newCommunityName}
                                 onChange={(e) => { setNewCommunityName(e.target.value); setCreateError(''); }}
                                 className="w-full h-14 md:h-16 px-6 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none text-lg md:text-xl font-bold transition-all shadow-sm focus:bg-white"
                                 placeholder="e.g. AI Innovators Collective"
                               />
                           </div>

                           <div className="space-y-2">
                              <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Mission / Description</label>
                              <textarea 
                                 value={newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription}
                                 onChange={(e) => setNewCommunityDescription(e.target.value)}
                                 className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl outline-none text-base font-medium transition-all resize-none h-32 shadow-sm focus:bg-white"
                                 placeholder="What's this community about? Share your vision..."
                               />
                           </div>

                           {createError && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 font-bold text-sm">
                                 <X className="w-5 h-5 cursor-pointer shrink-0" onClick={() => setCreateError('')} />
                                 <span className="flex-1">{createError}</span>
                              </motion.div>
                           )}

                           <button
                              onClick={async () => {
                                 if (!newCommunityName.trim() || isCreating) return;
                                 setIsCreating(true);
                                 setCreateError('');
                                 try {
                                   const icon = newCommunityDescription.startsWith('emoji:') ? newCommunityDescription.replace('emoji:', '') : '🚀';
                                   const description = newCommunityDescription.startsWith('emoji:') ? '' : newCommunityDescription;
                                   const res = await api.post('/communities', { name: newCommunityName.trim(), description, icon });
                                   setNewCommunityName('');
                                   setNewCommunityDescription('');
                                   setCreateError('');
                                   setActiveTab('hub');
                                   await fetchCommunities();
                                   if (res.data) {
                                      setSelectedCommunity(res.data);
                                      setSelectedChannel(null);
                                   }
                                   toast.success('Your community is live! 🚀');
                                 } catch (err: any) {
                                   setCreateError(err?.response?.data?.message || 'Failed to create community. Reach out to support if this persists.');
                                 } finally {
                                   setIsCreating(false);
                                 }
                              }}
                              disabled={!newCommunityName.trim() || isCreating}
                              className="w-full h-14 md:h-16 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group px-4"
                           >
                              {isCreating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <Rocket className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                              {isCreating ? 'Igniting Your Space...' : 'Launch My Community'}
                           </button>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-12">
                        {[
                           { title: 'Free Forever', desc: 'Communities are the heart of NextIgnition. They always stay free.', icon: Sparkles },
                           { title: 'Creator Tools', desc: 'Manage channels, roles and private voice lounges.', icon: ShieldCheck },
                           { title: 'Global Network', desc: 'Instantly connect with our network of top-tier talent.', icon: Users },
                        ].map((feat, i) => (
                           <div key={i} className="text-center space-y-2 p-6 rounded-3xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                 <feat.icon className="w-6 h-6 text-indigo-600" />
                              </div>
                              <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{feat.title}</h4>
                              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-tight leading-relaxed">{feat.desc}</p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          ) : restrictedAccess && selectedCommunity ? (
            <div className="absolute inset-0 z-50 dc-bg-chat flex items-center justify-center p-8 text-center">
              <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/20">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{selectedCommunity.name} is Restricted</h2>
                <p className="text-sm text-gray-600 mb-8 max-w-sm">
                  You need to be a member to view channels, read messages, and participate in this community.
                </p>
                {(() => {
                  const { isOpen } = getCommunityJoinMode(selectedCommunity);
                  const effectiveUserId = (currentUser?.id || currentUser?._id || '') as string;
                  const isPending = joinStatus === 'pending' || !!selectedCommunity.pendingMembers?.includes(effectiveUserId);

                  if (isPending) {
                    return (
                  <button disabled className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold cursor-not-allowed border border-gray-200">
                    <Check className="w-5 h-5" /> Request Pending
                  </button>
                    );
                  }

                  return (
                  <button
                    onClick={isOpen ? handleJoinCommunityNow : handleRequestJoin}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg ${
                      isOpen
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                    }`}
                  >
                    <Users className="w-5 h-5" /> Join Now
                  </button>
                  );
                })()}
              </div>
            </div>
          ) : channelRestricted ? (
            <div className="absolute inset-0 z-50 dc-bg-chat flex items-center justify-center p-8 text-center">
              <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-3xl shadow-2xl flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/20">
                  <Lock className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">#{channelRestricted.name} is Private</h2>
                <p className="text-sm text-gray-600 mb-8 max-w-sm">
                  Request access from the channel creator/admin to view and participate.
                </p>
                {channelRestricted.pending ? (
                  <button disabled className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold cursor-not-allowed border border-gray-200">
                    <Check className="w-5 h-5" /> Request Pending
                  </button>
                ) : (
                  <button
                    onClick={handleRequestChannelAccess}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Handshake className="w-5 h-5" /> Request Access
                  </button>
                )}
              </div>
            </div>
          ) : selectedChannel ? (
            <>
              {/* CHANNEL HEADER */}
              <header className="h-12 px-4 flex items-center justify-between dc-border border-b dc-bg-chat z-10 flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Hash className="w-5 h-5 text-dc-text-muted flex-shrink-0" />
                  <h2 className="font-bold text-dc-text-header truncate">{selectedChannel.name}</h2>
                  <div className="hidden md:block w-[1px] h-6 bg-black/10 mx-1" />
                  <p className="hidden md:block text-xs text-dc-text-muted truncate font-medium">{selectedChannel.description}</p>
                </div>
                <div className="flex items-center gap-3 text-dc-text-muted">
                  <button onClick={() => setShowPinned(!showPinned)} className={`p-1 hover:text-dc-text-header transition-colors ${showPinned ? 'text-dc-indigo' : ''}`}>
                    <Pin className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowMemberList(!showMemberList)} className={`p-1 hover:text-dc-text-header transition-colors ${showMemberList ? 'text-dc-indigo' : ''}`}>
                    <Users className="w-5 h-5" />
                  </button>
                  <div className="relative group/search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dc-text-muted group-focus-within/search:text-dc-indigo transition-colors pointer-events-none" />
                    <input name="input-f35a59"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search"
                      className="dc-bg-server text-dc-text-normal placeholder-dc-text-muted/50 text-[13px] font-medium pl-8 pr-3 py-1.5 rounded-lg w-40 focus:w-64 transition-all duration-300 outline-none border border-dc-border focus:border-dc-indigo/50 shadow-inner"
                    />
                  </div>
                  <button className="p-1 hover:text-dc-text-header transition-colors"><Bell className="w-5 h-5" /></button>
                </div>
              </header>

              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar bg-white">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in duration-700 bg-white">
                    <div className="w-20 h-20 bg-black/[0.02] rounded-3xl flex items-center justify-center mb-6 border border-dc-border shadow-lg">
                      <Search className="w-10 h-10 text-dc-indigo animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-black text-dc-text-header mb-2 tracking-tight">
                      {searchQuery ? "No results found" : `Welcome to #${selectedChannel.name}!`}
                    </h3>
                    <p className="text-dc-text-muted max-w-sm text-base leading-relaxed">
                      {searchQuery 
                        ? `We couldn't find any messages matching "${searchQuery}".` 
                        : "This is the start of a legendary conversation. Send a message to get things moving!"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 bg-white">
                      {filteredMessages.map((m) => <Fragment key={m._id}>{renderMessage(m, false)}</Fragment>)}
                    </div>
                    <div ref={messagesEndRef} className="h-4" />
                  </>
                )}
              </div>

              {/* MESSAGE INPUT */}
              <div className="px-4 pb-6 pt-2 flex-shrink-0 bg-white">
                {replyingTo && (
                  <div className="mx-2 mb-2 px-3 py-2 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100 shadow-sm animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-2 truncate opacity-80">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-xs font-bold text-indigo-700">Replying to {replyingTo.userId?.name}</span>
                      <span className="text-xs text-gray-500 truncate">{replyingTo.content}</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-dc-indigo to-purple-600 rounded-2xl blur opacity-0 group-focus-within:opacity-10 transition duration-500 pointer-events-none"></div>
                  
                  {isRecording ? (
                    /* ── WhatsApp-style Recording Overlay for Desktop ── */
                    <div className="relative bg-red-50/60 border border-red-200 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="p-2 hover:bg-red-150 rounded-xl transition-colors text-red-400 hover:text-red-600 flex-shrink-0"
                        title="Cancel recording"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="flex-1 flex items-center gap-3 mx-4 min-w-0">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        <span className="text-sm font-bold text-red-600 tabular-nums">
                          {formatRecordingDuration(recordingDuration)}
                        </span>
                        <div className="flex-1 flex items-center gap-0.5 overflow-hidden">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-red-300 rounded-full animate-pulse"
                              style={{
                                height: `${Math.random() * 18 + 4}px`,
                                animationDelay: `${i * 0.03}s`,
                                animationDuration: `${0.3 + Math.random() * 0.4}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={stopRecording}
                        className="p-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg active:scale-95 transition-all flex-shrink-0"
                        title="Send voice message"
                      >
                        <Send className="w-4 h-4 fill-current text-white" />
                      </button>
                    </div>
                  ) : (
                    /* ── Normal Desktop Input ── */
                    <div className="relative dc-bg-input rounded-2xl px-4 py-3 flex items-end gap-3 border border-dc-border shadow-sm">
                      <button
                        onClick={() => document.getElementById('community-attach')?.click()}
                        className="p-2 text-dc-text-muted hover:text-dc-text-header hover:bg-black/[0.03] rounded-xl transition-all flex-shrink-0 active:scale-95"
                        title="Attach file"
                        type="button"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <input type="file" multiple className="hidden" id="community-attach" onChange={(e) => handleUploadAttachments(e.target.files)} />
                      
                      <textarea name="textarea-726c72"
                        ref={mentionInputRef}
                        rows={1}
                        value={messageInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMessageInput(val);
                          const match = val.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
                          if (match) {
                            setMentionQuery(match[1]);
                            setShowMentionSuggestions(true);
                            setMentionIndex(0);
                          } else {
                            setShowMentionSuggestions(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (showMentionSuggestions && suggestedMembers.length > 0) {
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionIndex((prev) => (prev > 0 ? prev - 1 : suggestedMembers.length - 1));
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionIndex((prev) => (prev < suggestedMembers.length - 1 ? prev + 1 : 0));
                            } else if (e.key === 'Enter' || e.key === 'Tab') {
                              e.preventDefault();
                              const member = suggestedMembers[mentionIndex];
                              const newValue = messageInput.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, ` @${member.name} `);
                              setMessageInput(newValue);
                              setShowMentionSuggestions(false);
                              mentionInputRef.current?.focus();
                            } else if (e.key === 'Escape') {
                              setShowMentionSuggestions(false);
                            }
                          } else {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                          }
                        }}
                        placeholder={`Message #${selectedChannel?.name || 'channel'}`}
                        className="flex-1 bg-transparent border-none outline-none text-[15px] py-1.5 resize-none max-h-48 overflow-y-auto no-scrollbar text-dc-text-normal placeholder-dc-text-muted leading-relaxed font-medium"
                      />

                      {/* Mention Suggestions Popup */}
                      <AnimatePresence>
                        {showMentionSuggestions && suggestedMembers.length > 0 && (
                          <motion.div
                            ref={mentionDropdownRef}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full left-12 mb-2 w-64 bg-white border border-dc-border rounded-xl shadow-2xl overflow-hidden z-[70]"
                          >
                            <div className="px-3 py-2 bg-gray-50 border-b border-dc-border text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Members matching '{mentionQuery}'
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {suggestedMembers.map((m, idx) => (
                                <button
                                  key={m._id}
                                  type="button"
                                  onClick={() => {
                                    const newValue = messageInput.replace(/(?:^|\s)@([a-zA-Z0-9_]*)$/, ` @${m.name} `);
                                    setMessageInput(newValue);
                                    setShowMentionSuggestions(false);
                                    mentionInputRef.current?.focus();
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                    idx === mentionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 overflow-hidden flex-shrink-0 relative">
                                    <span className="absolute inset-0 flex items-center justify-center">
                                      {m.name.charAt(0).toUpperCase()}
                                    </span>
                                    {m.avatar && (
                                      <img 
                                        src={m.avatar.startsWith('http') || m.avatar.startsWith('data:') ? m.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${m.avatar.startsWith('/') ? '' : '/'}${m.avatar}`} 
                                        alt="" 
                                        className="w-full h-full object-cover absolute inset-0 z-10"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                    )}
                                  </div>
                                  <span className="font-bold text-sm truncate">{m.name}</span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-1 flex-shrink-0 mb-0.5">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="p-2 text-dc-text-muted hover:text-dc-text-header hover:bg-black/[0.03] rounded-xl transition-all"
                          title="Record voice message"
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        <div className="relative flex items-center" ref={emojiPickerRef}>
                          <button
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            className="p-2 text-dc-text-muted hover:text-yellow-500 hover:bg-black/[0.03] rounded-xl transition-all active:scale-90"
                            title="Emoji"
                            type="button"
                          >
                            <Smile className="w-5 h-5" />
                          </button>
                          {showEmojiPicker && (
                            <div
                              className="absolute bottom-full right-0 mb-2 w-64 p-3 rounded-2xl border border-dc-border bg-white shadow-2xl z-50"
                            >
                              <div className="grid grid-cols-8 gap-1">
                                {[
                                  '👍','👎','👌','🙌','👏','🙏','🤝','✅','❌','⚠️','ℹ️','❓','💯','🎯','🏁','🚀','🔥','⚡','💡','🧠','👀','🗣️','💬','📣','📌','📎','📝','🗂️','📁','🧾','📊','📈','📉','🧮','⏳','⌛','⏰','🗓️','📅','🔒','🔓','🛡️','🧪','🔍','🧭','📍','🌐','🧑‍💻','👩‍💻','👨‍💻','👥','🏆','🥇','🎉','⭐','✨','💼','📞','📧','🧵','🔁','➡️','⬅️','⬆️','⬇️',
                                  '😀','🙂','😊','😄','😅','😌','😎','🤓','🤔','😮','😬','😴','😕','😟','😤','😮‍💨','😭','😡','❤️','💚','💙'
                                ].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      setMessageInput((prev) => `${prev}${emoji}`);
                                      setShowEmojiPicker(false);
                                    }}
                                    className="h-7 w-7 rounded-lg hover:bg-black/[0.04] text-base leading-none"
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim()}
                          className="ml-1 p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale text-white rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                          title="Send (Enter)"
                        >
                          <Send className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center px-2 mt-2">
                  <p className="text-[10px] text-dc-text-muted font-bold uppercase tracking-widest opacity-50">Secure Channel</p>
                  <p className="text-[10px] text-dc-text-muted font-medium"><b>Shift + Enter</b> for new line</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
              {selectedCommunity ? (
                /* Community selected but no channel: show channel guide */
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white">
                  <div className="w-20 h-20 rounded-2xl bg-dc-indigo/10 flex items-center justify-center mb-5 text-4xl shadow-lg border border-dc-indigo/20">
                    {getCommunityIcon(selectedCommunity.name, selectedCommunity.icon)}
                  </div>
                  <h2 className="text-2xl font-bold text-dc-text-header mb-1">{selectedCommunity.name}</h2>
                  {selectedCommunity.description && (
                    <p className="text-sm text-dc-text-muted max-w-sm mb-5">{selectedCommunity.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-dc-text-muted mb-8">
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {selectedCommunity.memberCount || 0} members</span>
                    <span className="flex items-center gap-1.5"><Hash className="w-4 h-4" /> {currentChannels.length} channels</span>
                  </div>
                  <p className="text-dc-text-muted text-sm font-medium bg-black/[0.02] px-4 py-2 rounded-full border border-dc-border">👈 Pick a channel from the sidebar to start chatting</p>
                </div>
              ) : (
                /* No community: browse communities */
                <div className="p-6 bg-white min-h-full">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-dc-text-header mb-1 tracking-tight">Discover Communities</h2>
                    <p className="text-sm text-dc-text-muted">Find your tribe — join communities of founders, experts & investors.</p>
                  </div>
                  {visibleCommunities.length === 0 ? (
                    <div className="flex flex-col items-center py-24 text-center">
                      <div className="w-24 h-24 bg-dc-indigo/5 rounded-3xl flex items-center justify-center mb-6 text-5xl border border-dc-indigo/10 shadow-xl">🚀</div>
                      <h3 className="text-xl font-bold text-dc-text-header mb-2">No communities yet</h3>
                      <p className="text-sm text-dc-text-muted max-w-xs mb-8 leading-relaxed">Be the first to build a community for founders, experts and investors.</p>
                      <button
                        onClick={() => { setActiveTab('create'); setMobileView('create'); }}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" /> Create Community
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleCommunities.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => { setSelectedCommunity(c); setSelectedChannel(null); }}
                          className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all bg-white hover:bg-dc-indigo/[0.02] border border-dc-border hover:border-dc-indigo/30 group shadow-sm hover:shadow-md"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-dc-indigo/5 flex items-center justify-center text-3xl flex-shrink-0 group-hover:bg-dc-indigo/10 transition-colors border border-dc-indigo/10 shadow-inner">
                            {getCommunityIcon(c.name, c.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-dc-text-header truncate group-hover:text-dc-indigo transition-colors">{c.name}</h3>
                            {c.description && <p className="text-xs text-dc-text-muted truncate mt-1 leading-relaxed">{c.description}</p>}
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-[11px] font-bold text-dc-text-muted flex items-center gap-1 px-2 py-0.5 bg-black/[0.02] rounded-full"><Users className="w-3 h-3" /> {c.memberCount || 0} members</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-dc-text-muted group-hover:text-dc-indigo transition-all group-hover:translate-x-1 flex-shrink-0" />
                        </button>
                      ))}
                      <button
                        onClick={() => { setActiveTab('create'); setMobileView('create'); }}
                        className="flex items-center gap-4 p-5 rounded-2xl text-left border border-dashed border-dc-border hover:border-dc-green/40 hover:bg-dc-green/[0.02] transition-all group"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-dc-green/5 flex items-center justify-center group-hover:bg-dc-green/10 transition-colors border border-dc-green/10 shadow-inner">
                          <Plus className="w-7 h-7 text-dc-green stroke-[3]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-dc-green tracking-tight">Create a new community</h3>
                          <p className="text-xs text-dc-text-muted mt-1">Start your own space for collaboration</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* COLUMN 4: MEMBER LIST (240px) */}
        <AnimatePresence>
          {selectedChannel && showMemberList && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="dc-bg-sidebar border-l border-dc-border flex flex-col flex-shrink-0 overflow-hidden shadow-2xl z-20"
            >
              <div className="h-12 px-4 flex items-center dc-border border-b bg-dc-bg-sidebar/50 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-black text-[11px] text-dc-text-muted uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-dc-green rounded-full shadow-[0_0_8px_rgba(35,165,90,0.2)]" />
                  Members — {members.length}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-6 no-scrollbar">
                <div>
                  <div className="px-2 py-1 text-[10px] font-black text-dc-text-muted uppercase tracking-[0.2em] mb-2 opacity-60">
                    Online — {members.length}
                  </div>
                  <div className="space-y-0.5">
                    {filteredMembers.map((member) => {
                      const roleColors: Record<string, string> = {
                        founder: 'text-orange-500',
                        expert: 'text-dc-indigo',
                        investor: 'text-dc-green',
                      };
                      const roleColor = roleColors[member.role?.toLowerCase()] || 'text-dc-text-muted';
                      
                      return (
                        <button
                          key={member._id}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/[0.03] transition-all group text-left relative"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-dc-indigo/5 border border-dc-border flex items-center justify-center text-xs font-black text-dc-indigo shadow-sm overflow-hidden transition-transform group-hover:scale-105 relative">
                              <span className="w-full h-full flex items-center justify-center absolute inset-0">
                                {member.name.charAt(0).toUpperCase()}
                              </span>
                              {member.avatar && (
                                <img 
                                  src={member.avatar.startsWith('http') || member.avatar.startsWith('data:') ? member.avatar : `${import.meta.env.VITE_API_URL || 'https://nextignition-l3b5.onrender.com'}${member.avatar.startsWith('/') ? '' : '/'}${member.avatar}`} 
                                  alt={member.name} 
                                  className="w-full h-full object-cover absolute inset-0 z-10"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-dc-green border-[3px] border-dc-bg-sidebar rounded-full shadow-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[14px] font-bold text-dc-text-header truncate group-hover:text-dc-indigo transition-colors">{member.name}</span>
                              {member.isVerified && (
                                <BadgeCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className={`w-1 h-1 rounded-full bg-current ${roleColor} opacity-40`} />
                              <p className={`text-[10px] truncate font-black tracking-widest uppercase ${roleColor} opacity-80`}>{member.role}</p>
                            </div>
                          </div>
                          
                          {/* Hover Action (Message) */}
                          <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1.5 bg-white rounded-lg border border-dc-border shadow-xl">
                              <MessageSquare className="w-3.5 h-3.5 text-dc-text-muted hover:text-dc-indigo" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <VoiceSettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              settingsTab={settingsTab}
              setSettingsTab={setSettingsTab}
              inputVolume={inputVolume}
              setInputVolume={setInputVolume}
              outputVolume={outputVolume}
              setOutputVolume={setOutputVolume}
              selectedMic={selectedMic}
              setSelectedMic={setSelectedMic}
              selectedSpeaker={selectedSpeaker}
              setSelectedSpeaker={setSelectedSpeaker}
            />
          )}
        </AnimatePresence>
      </div>

      <ReportDialog
        open={!!reportMessage}
        onClose={() => setReportMessage(null)}
        targetType="message"
        targetId={reportMessage?.id || ''}
        targetLabel={reportMessage?.author}
      />
  </>
  );
};


