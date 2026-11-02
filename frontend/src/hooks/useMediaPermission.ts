import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type MediaType = 'camera' | 'microphone' | 'display-capture';

interface UseMediaPermissionResult {
  hasPermission: boolean | null; // null = unknown, true = granted, false = denied
  requestPermission: (constraints?: MediaStreamConstraints) => Promise<boolean>;
  error: string | null;
  isLoading: boolean;
}

/**
 * Global hook for managing media permissions (camera, microphone, screen capture)
 * Centralizes permission requests and error handling across the app
 * Shows user-friendly error messages via toast notifications
 */
export const useMediaPermission = (mediaType: MediaType = 'camera'): UseMediaPermissionResult => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getConstraints = (type: MediaType): MediaStreamConstraints => {
    switch (type) {
      case 'camera':
        return { video: true, audio: false };
      case 'microphone':
        return { video: false, audio: true };
      case 'display-capture':
        return { audio: true, video: true };
      default:
        return { video: true, audio: false };
    }
  };

  const requestPermission = useCallback(
    async (constraints?: MediaStreamConstraints): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const mediaConstraints = constraints || getConstraints(mediaType);
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);

        // Clean up the stream immediately - we just needed to check permissions
        stream.getTracks().forEach((track) => track.stop());

        setHasPermission(true);
        return true;
      } catch (err: any) {
        const errorName = err?.name || 'UnknownError';
        const isPermissionDenied =
          errorName === 'NotAllowedError' ||
          errorName === 'PermissionDeniedError' ||
          err?.message?.includes('Permission denied');

        if (isPermissionDenied) {
          setHasPermission(false);
          const msg = `${mediaType === 'camera' ? 'Camera' : mediaType === 'microphone' ? 'Microphone' : 'Screen capture'} access denied. Please enable permissions in your device settings.`;
          setError(msg);
          
          // Show toast notification
          toast.error(msg, {
            duration: 5000,
            description: 'Update browser permissions to continue',
          });
        } else {
          setError(err?.message || 'Failed to access media device');
          toast.error(err?.message || 'Unable to access media device', {
            duration: 4000,
          });
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [mediaType]
  );

  return {
    hasPermission,
    requestPermission,
    error,
    isLoading,
  };
};

/**
 * Convenience hook for camera/video capture
 */
export const useCamera = () => useMediaPermission('camera');

/**
 * Convenience hook for microphone/audio capture
 */
export const useMicrophone = () => useMediaPermission('microphone');

/**
 * Convenience hook for screen/display capture
 */
export const useScreenCapture = () => useMediaPermission('display-capture');
