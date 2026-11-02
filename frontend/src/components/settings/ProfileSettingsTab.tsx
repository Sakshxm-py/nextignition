import { useEffect, useRef, useState } from 'react';
import { Camera, MapPin, Globe, Trash2, Upload, Video, X, Check, Linkedin, Twitter, Github, Instagram, Mic, Circle, StopCircle, Play, Square, RotateCcw } from 'lucide-react';
import { brandColors } from '../../utils/colors';
import { updateProfile, getProfile, uploadAvatar, uploadCoverPhoto, uploadVideo, removeAvatar, verifySocialLink } from '../../services/userService';
import { getCurrentUser } from '../../services/authService';
import { useMediaPermission } from '../../hooks/useMediaPermission';

interface ProfileSettingsTabProps {
  userRole: 'founder' | 'expert' | 'investor';
}

export function ProfileSettingsTab({ userRole }: ProfileSettingsTabProps) {
  const { requestPermission: requestCameraPermission } = useMediaPermission('camera');
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const [introVideoUrl, setIntroVideoUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<any>(null);

  const [recordingQuality, setRecordingQuality] = useState<'low' | 'standard' | 'high'>('standard');

  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string>('');

  // Socials
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [instagram, setInstagram] = useState('');
  const [socialsVerified, setSocialsVerified] = useState<Record<string, boolean>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

  // Founder specific
  const [foundedMonth, setFoundedMonth] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [startupRole, setStartupRole] = useState('');
  const [startupStatus, setStartupStatus] = useState('');
  const [startupName, setStartupName] = useState('');
  const [startupIndustry, setStartupIndustry] = useState('');
  const [startupStage, setStartupStage] = useState('');
  const [fundingStatus, setFundingStatus] = useState('');
  const [teamSize, setTeamSize] = useState('');

  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');

  const cacheBust = (url: string) => {
    if (!url) return '';
    return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const user = getCurrentUser();
      if (user) {
        const userId = user.id || user._id;
        if (!userId) {
          setIsFetching(false);
          return;
        }
        try {
          const profile = await getProfile(userId);
          setFullName(profile.name || user.name || '');
          setUsername(profile.username || user.username || '');
          setBio(profile.profile?.bio || '');
          const pref = profile.profile?.preferences || {};
          if (pref.recordingQuality === 'low' || pref.recordingQuality === 'standard' || pref.recordingQuality === 'high') {
            setRecordingQuality(pref.recordingQuality);
          }

          setLocation(profile.profile?.location || '');
          setWebsite(profile.profile?.website || '');
          setAvatarUrl(profile.avatar || user.avatar || '');
          setCoverPhotoUrl(profile.coverPhoto || user.coverPhoto || '');
          setIntroVideoUrl(profile.introVideo || user.introVideo || '');

          setLinkedin(profile.profile?.socials?.linkedin || '');
          setTwitter(profile.profile?.socials?.twitter || '');
          setGithub(profile.profile?.socials?.github || '');
          setInstagram(profile.profile?.socials?.instagram || '');
          setSocialsVerified(profile.profile?.socialsVerified || {});

          if (userRole === 'founder') {
            setFoundedMonth(profile.profile?.foundedMonth || 'January');
            setFoundedYear(profile.profile?.foundedYear || '2024');
            setStartupRole(profile.profile?.startupRole || 'Founder');
            setStartupStatus(profile.profile?.startupStatus || 'has-startup');
            setStartupName(profile.profile?.startupName || '');
            setStartupIndustry(profile.profile?.startupIndustry || '');
            setStartupStage(profile.profile?.startupStage || 'Ideation');
            setFundingStatus(profile.profile?.fundingStatus || 'Bootstrapped');
            setTeamSize(profile.profile?.teamSize || '1');
          }

          if (profile.updatedAt) {
            setLastSaved(new Date(profile.updatedAt).toLocaleTimeString());
          }
        } catch (error) {
          console.error('Error fetching profile', error);
        } finally {
          setIsFetching(false);
        }
      }
    };

    fetchProfile();
  }, [userRole]);

  const normalizeUrl = (value: string) => {
    const v = String(value || '').trim();
    if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const isValidUrlForPlatform = (platform: string, value: string) => {
    if (!value) return true;
    try {
      const u = new URL(normalizeUrl(value));
      const host = u.hostname.toLowerCase();
      if (platform === 'linkedin') return host.includes('linkedin.com');
      if (platform === 'twitter') return host.includes('twitter.com') || host.includes('x.com');
      if (platform === 'github') return host.includes('github.com');
      if (platform === 'instagram') return host.includes('instagram.com');
      return true;
    } catch {
      return false;
    }
  };

  const handleVerifySocial = async (platform: string, value: string) => {
    const url = normalizeUrl(value);
    if (!url) {
      setSocialsVerified((prev) => ({ ...prev, [platform]: false }));
      return;
    }
    if (!isValidUrlForPlatform(platform, url)) {
      setMessage(`Invalid ${platform} URL`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    try {
      setVerifying((prev) => ({ ...prev, [platform]: true }));
      const res = await verifySocialLink(platform, url);
      
      if (res?.verified === false) {
        setMessage(res.message || `Failed to verify ${platform} link. It may be invalid or private.`);
        setSocialsVerified((prev) => ({ ...prev, [platform]: false }));
        setTimeout(() => setMessage(''), 4000);
        return;
      }

      if (res?.socials?.[platform]) {
        if (platform === 'linkedin') setLinkedin(res.socials[platform]);
        if (platform === 'twitter') setTwitter(res.socials[platform]);
        if (platform === 'github') setGithub(res.socials[platform]);
        if (platform === 'instagram') setInstagram(res.socials[platform]);
      }
      if (res?.socialsVerified) {
        setSocialsVerified(res.socialsVerified);
      } else {
        setSocialsVerified((prev) => ({ ...prev, [platform]: true }));
      }
      setMessage(`${platform} link verified`);
      setTimeout(() => setMessage(''), 2500);
    } catch {
      setMessage(`Failed to verify ${platform} link`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setVerifying((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const handleAvatarPick = () => avatarInputRef.current?.click();
  const handleTakePhoto = () => cameraInputRef.current?.click();
  const handleCoverPick = () => coverInputRef.current?.click();

  const handleRemoveAvatar = async () => {
    if (isUploadingAvatar) return;
    try {
      setIsUploadingAvatar(true);
      await removeAvatar();
      setAvatarUrl('');
      setAvatarError(false);
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, avatar: '' }));
      }
      setMessage('Profile photo removed.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error removing avatar', error);
      setMessage('Failed to remove profile photo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const res = await uploadAvatar(file);
      setAvatarUrl(cacheBust(res.avatar));
      setAvatarError(false);
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, avatar: res.avatar }));
      }
      setMessage('Profile photo updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to upload photo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCover(true);
      const res = await uploadCoverPhoto(file);
      setCoverPhotoUrl(cacheBust(res.coverPhoto));
      setCoverError(false);
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, coverPhoto: res.coverPhoto }));
      }
      setMessage('Cover photo updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to upload cover photo.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const cleanupVideoStream = () => {
    try {
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    localStreamRef.current = null;
    if (videoPreviewRef.current) {
      try {
        (videoPreviewRef.current as any).srcObject = null;
      } catch {
        // ignore
      }
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.stop();
      } else {
        cleanupVideoStream();
      }
    } catch {
      cleanupVideoStream();
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    if (isRecording || isUploadingVideo) return;

    try {
      setVideoPreviewUrl('');
      setRecordedBlob(null);
      setRecordingTime(0);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (videoPreviewRef.current) {
        (videoPreviewRef.current as any).srcObject = stream;
      }

      videoChunksRef.current = [];

      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const qualityToBitrate = (q: 'low' | 'standard' | 'high') => {
        if (q === 'low') return { videoBitsPerSecond: 400_000, audioBitsPerSecond: 64_000 };
        if (q === 'high') return { videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 };
        return { videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 96_000 };
      };

      const opts: MediaRecorderOptions = {
        ...(mimeType ? { mimeType } : {}),
        ...qualityToBitrate(recordingQuality),
      };

      const mr = new MediaRecorder(stream, opts);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (evt: BlobEvent) => {
        if (evt.data && evt.data.size > 0) {
          videoChunksRef.current.push(evt.data);
        }
      };

      mr.onstop = () => {
        cleanupVideoStream();
        const blob = new Blob(videoChunksRef.current, { type: mr.mimeType || 'video/webm' });
        videoChunksRef.current = [];
        if (blob.size > 0) {
          setRecordedBlob(blob);
          setVideoPreviewUrl(URL.createObjectURL(blob));
        }
      };

      mr.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          const next = t + 1;
          if (next >= 30) {
            try {
              stopRecording();
            } catch {
              // ignore
            }
          }
          return next;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Error starting recording', error);
      cleanupVideoStream();
      setIsRecording(false);
      
      // Use the centralized permission hook for consistent error messages
      const isPermissionDenied = 
        error?.name === 'NotAllowedError' || 
        error?.name === 'PermissionDeniedError' ||
        error?.message?.includes('Permission denied');
      
      if (isPermissionDenied) {
        requestCameraPermission();
      } else {
        setMessage('Unable to access camera/microphone. Please allow permissions.');
        setTimeout(() => setMessage(''), 5000);
      }
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setMessage('Please select a video file.');
      setTimeout(() => setMessage(''), 3000);
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    setRecordedBlob(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    setIntroVideoUrl('');
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const uploadIntroVideo = async (blob: Blob) => {
    if (isUploadingVideo) return;

    try {
      setIsUploadingVideo(true);
      const file =
        blob instanceof File
          ? blob
          : new File([blob], `intro-${Date.now()}.webm`, { type: blob.type || 'video/webm' });
      const res = await uploadVideo(file);
      setIntroVideoUrl(cacheBust(res.videoUrl));
      setVideoPreviewUrl('');
      setRecordedBlob(null);

      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({ ...current, introVideo: res.videoUrl }));
      }

      setMessage('Intro video saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading intro video', error);
      setMessage('Failed to upload intro video.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const profileData: any = {
        name: fullName,
        username,
        bio,
        location,
        website: normalizeUrl(website),
        socials: {
          linkedin: normalizeUrl(linkedin),
          twitter: normalizeUrl(twitter),
          github: normalizeUrl(github),
          instagram: normalizeUrl(instagram)
        }
      };

      if (userRole === 'founder') {
        profileData.foundedMonth = foundedMonth;
        profileData.foundedYear = foundedYear;
        profileData.startupRole = startupRole;
        profileData.startupStatus = startupStatus;
        profileData.startupName = startupName;
        profileData.startupIndustry = startupIndustry;
        profileData.startupStage = startupStage;
        profileData.fundingStatus = fundingStatus;
        profileData.teamSize = teamSize;
      }

      const updatedUser = await updateProfile(profileData);

      // Update Local Storage
      const current = getCurrentUser();
      if (current) {
        localStorage.setItem('user', JSON.stringify({
          ...current,
          name: fullName,
          username,
          avatar: avatarUrl.split('?v=')[0],
          coverPhoto: coverPhotoUrl.split('?v=')[0],
          ...updatedUser
        }));
      }

      setLastSaved(new Date().toLocaleTimeString());
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const bioCharLimit = 160;

  if (isFetching && !fullName) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your public profile information</p>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-medium">
          {message}
        </div>
      )}

      {/* Section 1: Profile Header */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Profile Header</h2>

        {/* Cover Photo */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Cover Photo</label>
          <input name="input-ec4c2c"
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverFileChange}
          />
          <div
            onClick={handleCoverPick}
            className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200"
            style={{ height: '200px' }}
          >
            {coverPhotoUrl && !coverError ? (
              <img
                src={coverPhotoUrl}
                alt="Cover"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={() => setCoverError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">{isUploadingCover ? 'Uploading...' : 'Change Cover'}</p>
                <p className="text-xs text-white/80 mt-1">Recommended: 1200×300px</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
          <div className="relative">
            <div
              onClick={handleAvatarPick}
              className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-white text-4xl font-bold cursor-pointer group overflow-hidden border-4 border-white shadow-md leading-none"
            >
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="text-gray-400">{fullName?.charAt(0) || '?'}</span>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-bold mb-2">Profile Picture</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload a clear, professional photo. Max 5MB (JPG, PNG)
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <input name="input-f201a7"
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <input name="input-b3ec38"
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                onClick={handleAvatarPick}
                disabled={isUploadingAvatar}
                className="px-4 py-2 rounded-lg font-medium text-sm text-white disabled:opacity-60 flex items-center gap-2"
                style={{ background: brandColors.electricBlue }}
              >
                <Upload className="w-4 h-4" />
                {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
              </button>

              <button
                onClick={handleTakePhoto}
                disabled={isUploadingAvatar}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Take Photo
              </button>
              <button
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar || !avatarUrl}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Basic Information */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Basic Information</h2>

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input name="input-3871d5"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={50}
              placeholder="Your full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input name="input-f20f84"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full pl-8 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {username && (
                <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
          </div>

          {/* Bio/Tagline */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio/Tagline</label>
            <textarea name="textarea-6a4acf"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, bioCharLimit))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Tell people what you are building or looking for..."
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Appears below your name on your profile</p>
              <p className={`text-xs ${bio.length >= bioCharLimit ? 'text-orange-500' : 'text-gray-500'}`}>
                {bio.length}/{bioCharLimit}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="input-aecf27"
                  type="text"
                  placeholder="City, Country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium mb-2">Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input name="input-c84293"
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Founded Date (Founder only) */}
          {userRole === 'founder' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Founded Month</label>
                <select name="select-1f1152"
                  value={foundedMonth}
                  onChange={(e) => setFoundedMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option>January</option>
                  <option>February</option>
                  <option>March</option>
                  <option>April</option>
                  <option>May</option>
                  <option>June</option>
                  <option>July</option>
                  <option>August</option>
                  <option>September</option>
                  <option>October</option>
                  <option>November</option>
                  <option>December</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Founded Year</label>
                <select name="select-859ea1"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() + 1 - i).map(year => (
                    <option key={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Current Role (Founder only) */}
          {userRole === 'founder' && (
            <div>
              <label className="block text-sm font-medium mb-2">Current Role</label>
              <select name="select-f9647f"
                value={startupRole}
                onChange={(e) => setStartupRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Founder</option>
                <option>Co-founder</option>
                <option>Solo Founder</option>
              </select>
            </div>
          )}

          {/* Startup Status (Founder only) */}
          {userRole === 'founder' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Startup Status</label>
                <select name="select-e9b130"
                  value={startupStatus}
                  onChange={(e) => setStartupStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="has-startup">I have a startup</option>
                  <option value="wants-to-join">I want to join a startup</option>
                  <option value="ideal">I'm ideal (open to both)</option>
                </select>
              </div>

              {startupStatus === 'has-startup' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Startup Name</label>
                      <input name="input-933fb1"
                        type="text"
                        value={startupName}
                        onChange={(e) => setStartupName(e.target.value)}
                        placeholder="My Startup"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Industry</label>
                      <input name="input-39b2c4"
                        type="text"
                        value={startupIndustry}
                        onChange={(e) => setStartupIndustry(e.target.value)}
                        placeholder="SaaS, FinTech, etc."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Stage</label>
                      <select name="select-9f29c2"
                        value={startupStage}
                        onChange={(e) => setStartupStage(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>Ideation</option>
                        <option>MVP</option>
                        <option>Early Traction</option>
                        <option>Scaling</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Funding Status</label>
                      <select name="select-533415"
                        value={fundingStatus}
                        onChange={(e) => setFundingStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option>Bootstrapped</option>
                        <option>Pre-seed</option>
                        <option>Seed</option>
                        <option>Series A+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Team Size</label>
                      <input name="input-fd1932"
                        type="text"
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        placeholder="1-5"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Social Links */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">Social Links</h2>

        <div className="space-y-4">
          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-blue-600" />
              LinkedIn
            </label>
            <div className="flex gap-2">
              <input name="input-afc7f9"
                type="url"
                value={linkedin}
                onChange={(e) => {
                  setLinkedin(e.target.value);
                  setSocialsVerified((prev) => ({ ...prev, linkedin: false }));
                }}
                onBlur={() => handleVerifySocial('linkedin', linkedin)}
                placeholder="https://linkedin.com/in/username"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  socialsVerified.linkedin ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => !socialsVerified.linkedin && handleVerifySocial('linkedin', linkedin)}
                disabled={verifying.linkedin}
                className={`px-4 py-2 border rounded-lg font-medium text-sm flex items-center justify-center min-w-[100px] transition-all ${
                  socialsVerified.linkedin 
                    ? 'border-green-500 bg-green-500 text-white cursor-default' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying.linkedin ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${socialsVerified.linkedin ? 'border-white' : 'border-blue-600'}`} />
                ) : socialsVerified.linkedin ? (
                  <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Verified</span>
                ) : 'Verify'}
              </button>
            </div>
          </div>

          {/* Twitter */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Twitter className="w-4 h-4 text-blue-400" />
              Twitter / X
            </label>
            <div className="flex gap-2">
              <input name="input-afe639"
                type="url"
                value={twitter}
                onChange={(e) => {
                  setTwitter(e.target.value);
                  setSocialsVerified((prev) => ({ ...prev, twitter: false }));
                }}
                onBlur={() => handleVerifySocial('twitter', twitter)}
                placeholder="https://x.com/username"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  socialsVerified.twitter ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => !socialsVerified.twitter && handleVerifySocial('twitter', twitter)}
                disabled={verifying.twitter}
                className={`px-4 py-2 border rounded-lg font-medium text-sm flex items-center justify-center min-w-[100px] transition-all ${
                  socialsVerified.twitter 
                    ? 'border-green-500 bg-green-500 text-white cursor-default' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying.twitter ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${socialsVerified.twitter ? 'border-white' : 'border-blue-400'}`} />
                ) : socialsVerified.twitter ? (
                  <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Verified</span>
                ) : 'Verify'}
              </button>
            </div>
          </div>

          {/* GitHub */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Github className="w-4 h-4" />
              GitHub
            </label>
            <div className="flex gap-2">
              <input name="input-0c7b73"
                type="url"
                value={github}
                onChange={(e) => {
                  setGithub(e.target.value);
                  setSocialsVerified((prev) => ({ ...prev, github: false }));
                }}
                onBlur={() => handleVerifySocial('github', github)}
                placeholder="https://github.com/username"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  socialsVerified.github ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => !socialsVerified.github && handleVerifySocial('github', github)}
                disabled={verifying.github}
                className={`px-4 py-2 border rounded-lg font-medium text-sm flex items-center justify-center min-w-[100px] transition-all ${
                  socialsVerified.github 
                    ? 'border-green-500 bg-green-500 text-white cursor-default' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying.github ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${socialsVerified.github ? 'border-white' : 'border-black'}`} />
                ) : socialsVerified.github ? (
                  <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Verified</span>
                ) : 'Verify'}
              </button>
            </div>
          </div>

          {/* Instagram */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-600" />
              Instagram
            </label>
            <div className="flex gap-2">
              <input name="input-b5f570"
                type="url"
                value={instagram}
                onChange={(e) => {
                  setInstagram(e.target.value);
                  setSocialsVerified((prev) => ({ ...prev, instagram: false }));
                }}
                onBlur={() => handleVerifySocial('instagram', instagram)}
                placeholder="https://instagram.com/username"
                className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  socialsVerified.instagram ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={() => !socialsVerified.instagram && handleVerifySocial('instagram', instagram)}
                disabled={verifying.instagram}
                className={`px-4 py-2 border rounded-lg font-medium text-sm flex items-center justify-center min-w-[100px] transition-all ${
                  socialsVerified.instagram 
                    ? 'border-green-500 bg-green-500 text-white cursor-default' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {verifying.instagram ? (
                  <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${socialsVerified.instagram ? 'border-white' : 'border-pink-600'}`} />
                ) : socialsVerified.instagram ? (
                  <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Verified</span>
                ) : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: 30-Second Intro Video */}
      <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
        <h2 className="text-xl font-bold mb-6">30-Second Intro Video</h2>

        <div className="space-y-6">
          {(introVideoUrl || videoPreviewUrl) && !isRecording ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto shadow-lg">
              <video
                src={videoPreviewUrl || introVideoUrl}
                controls
                className="w-full h-full"
              />
              <button
                onClick={() => {
                  setIntroVideoUrl('');
                  setVideoPreviewUrl('');
                  setRecordedBlob(null);
                }}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : isRecording ? (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
                <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse">
                    <div className="w-6 h-6 bg-red-500 rounded-sm" />
                  </div>
                </div>
                <p className="text-2xl font-bold mb-2 drop-shadow-lg">Recording...</p>
                <p className="text-red-500 font-mono text-xl drop-shadow-lg">{30 - recordingTime}s remaining</p>
                <div className="mt-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold">
                  {recordingQuality === 'low' ? '🔹 Low Quality' : recordingQuality === 'high' ? '🎯 High Quality' : '⚡ Standard Quality'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stopRecording();
                  }}
                  className="mt-6 px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto pointer-events-auto shadow-xl"
                >
                  <Square className="w-5 h-5 fill-black" />
                  Stop Recording
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 group hover:border-blue-400 transition-colors">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 group-hover:scale-110 transition-transform">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Create your elevator pitch</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Introduce yourself, your idea, or your expertise in 30 seconds. Video intro's increase profile engagement by 3x.
              </p>

              {/* Recording Quality Selector */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Recording Quality</p>
                <div className="flex justify-center gap-2">
                  {(['low', 'standard', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setRecordingQuality(q)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all capitalize ${
                        recordingQuality === q
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {q === 'low' ? '🔹 Low' : q === 'standard' ? '⚡ Standard' : '🎯 High'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2 text-center">
                  {recordingQuality === 'low' ? 'Smaller file size, faster upload' : recordingQuality === 'high' ? 'Best quality, larger file' : 'Balanced quality and size'}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-md"
                >
                  <Circle className="w-4 h-4 fill-white" />
                  Record Now
                </button>
                <input name="input-9f81e5"
                  type="file"
                  ref={videoInputRef}
                  onChange={handleVideoFileChange}
                  accept="video/*"
                  className="hidden"
                />
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-gray-300 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Upload Video
                </button>
              </div>
            </div>
          )}

          {recordedBlob && !introVideoUrl && !isRecording && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => uploadIntroVideo(recordedBlob)}
                disabled={isUploadingVideo}
                className="px-8 py-3 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105"
                style={{ background: brandColors.electricBlue }}
              >
                {isUploadingVideo ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Save Video
                  </>
                )}
              </button>
              <button
                onClick={startRecording}
                disabled={isUploadingVideo}
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Retake
              </button>
            </div>
          )}

          {introVideoUrl && (
            <div className="flex justify-center">
              <button
                onClick={() => videoInputRef.current?.click()}
                className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Replace Video
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg relative md:sticky md:bottom-4 z-40 border border-gray-200 mt-8 mb-4">
        <div className="text-sm text-gray-500">
          {lastSaved ? `Last saved at ${lastSaved}` : 'No changes saved yet'}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isUploadingAvatar || isUploadingCover || isFetching}
            className="px-8 py-2 rounded-lg font-bold text-white disabled:opacity-60 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center"
            style={{ background: brandColors.electricBlue }}>
            {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}