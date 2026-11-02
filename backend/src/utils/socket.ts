import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

export const app = express();
export const httpServer = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://localhost',
        'capacitor://localhost',
        'http://10.0.2.2',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://nextignition.com',
        'https://www.nextignition.com',
        'https://nextignition-three.vercel.app',
        'https://nextignition-l3b5.onrender.com',
    ];

const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    if (allowedOrigins.includes('*')) return true;
    if (allowedOrigins.includes(origin)) return true;
    
    // Support local network IPs and common dev ports
    if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) return true;
    if (origin.startsWith('capacitor://')) return true;
    
    // NOTE: do NOT wildcard-match *.onrender.com / *.netlify.app / *.vercel.app —
    // with credentialed CORS, any attacker hosting on a free subdomain there could
    // make authenticated cross-origin requests. Add real prod origins to the
    // explicit allowlist above (or CORS_ORIGIN) instead.
    return false;
};


export const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
});

export { allowedOrigins, isAllowedOrigin };
