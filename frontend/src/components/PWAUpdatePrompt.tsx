import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function PWAUpdatePrompt() {
  const sw = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  const offlineReady = sw?.offlineReady?.[0];
  const setOfflineReady = sw?.offlineReady?.[1];
  const needRefresh = sw?.needRefresh?.[0];
  const setNeedRefresh = sw?.needRefresh?.[1];
  const updateServiceWorker = sw?.updateServiceWorker;

  const close = () => {
    setOfflineReady?.(false);
    setNeedRefresh?.(false);
  };

  useEffect(() => {
    if (offlineReady) {
      toast.info('App ready to work offline!', {
        action: {
          label: 'Close',
          onClick: () => close(),
        },
      });
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast.info('New content available, click on reload button to update.', {
        action: {
          label: 'Reload',
          onClick: () => updateServiceWorker?.(true),
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
