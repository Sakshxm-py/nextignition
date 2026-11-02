/**
 * socketService.ts — Shared Socket.IO Singleton
 *
 * SINGLE connection shared by ALL components in the app.
 * Previously each component called io() independently, creating
 * multiple competing connections that immediately closed each other.
 *
 * Usage:
 *   import { getSocket } from '../services/socketService';
 *   const socket = getSocket();
 *   socket.on('my_event', handler);
 *
 * DO NOT call socket.disconnect() from individual components.
 * The singleton manages its own lifecycle.
 */

import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

import { getSingletonApiBase } from '../utils/apiResolution';

const getSocketBaseUrl = (): string => {
  const envBase = import.meta.env.VITE_API_URL as string | undefined;
  const rawBase = getSingletonApiBase(envBase);

  // Strip the /api suffix to get the socket root URL
  return String(rawBase)
    .replace(/\/+api\/?$/, '')
    .replace(/\/+$/, '');
};

export const getSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  const socketBase = getSocketBaseUrl();

  let didFallback = false;

  socketInstance = io(socketBase, {
    // Force HTTP Polling ONLY.
    // This absolutely guarantees zero issues with aggressive reverse proxy WebSocket drops,
    // Render zero-downtime deploy conflicts, and restrictive corporate firewalls.
    transports: ['polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    // Send the JWT on every (re)connection attempt so the backend can
    // authenticate the socket and place it in its per-user notification room.
    // A function is used (not a static object) so the latest token is read
    // even after login/refresh changes it.
    auth: (cb) => cb({ token: localStorage.getItem('token') || '' }),
  });

  socketInstance.on('connect', () => {
    console.log('[Socket] Connected! ID:', socketInstance?.id, 'Transport:', socketInstance?.io?.engine?.transport?.name);
    // Late-auth safety net: if the socket connected before the user logged in,
    // explicitly register the current token so the server joins our user room.
    try {
      const token = localStorage.getItem('token');
      if (token) socketInstance?.emit('register', token);
    } catch { /* ignore */ }
    // Save the working base URL for future local dev sessions
    try {
      const isLocal = /localhost|127\.0\.0\.1|192\.168\.|10\.0\.2\.2/.test(socketBase);
      if (isLocal) {
        localStorage.setItem('preferredApiBaseUrl', `${socketBase}/api`);
      }
    } catch { /* ignore */ }
  });

  socketInstance.on('disconnect', (reason) => {
    // Only warn if the server explicitly kicked the client due to an authentication or unrecoverable error.
    if (reason === 'io server disconnect') {
      console.warn('[Socket] Server explicitly disconnected us, reconnecting manually...');
      socketInstance?.connect();
    }
    // "transport close" and "ping timeout" are completely normal and ignored because the client socket seamlessly auto-recovers!
  });

  socketInstance.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message);
  });

  return socketInstance;
};

/** Call this only at app root unmount — never from individual page components */
export const disconnectSocket = (): void => {
  if (socketInstance) {
    try { socketInstance.removeAllListeners(); socketInstance.disconnect(); } catch { /* ignore */ }
    socketInstance = null;
  }
};

export default getSocket;
