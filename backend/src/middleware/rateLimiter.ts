import { Request, Response, NextFunction } from 'express';

// ✅ Simple in-memory rate limiter for profile access
class RateLimiter {
    private requests: Map<string, { count: number; resetTime: number }> = new Map();
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(windowMs: number = 60000, maxRequests: number = 30) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
    }

    private getKey(req: Request): string {
        // Use IP + userId for authenticated users, IP only for public
        const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
        const userId = (req as any).user?.id;
        return userId ? `${userId}_${ip}` : ip;
    }

    check(req: Request, res: Response, next: NextFunction) {
        const key = this.getKey(req);
        const now = Date.now();

        let record = this.requests.get(key);

        // Initialize or reset if window has passed
        if (!record || now > record.resetTime) {
            record = {
                count: 1,
                resetTime: now + this.windowMs
            };
        } else {
            record.count++;
        }

        this.requests.set(key, record);

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': this.maxRequests.toString(),
            'X-RateLimit-Remaining': Math.max(0, this.maxRequests - record.count).toString(),
            'X-RateLimit-Reset': record.resetTime.toString()
        });

        // Check if exceeded
        if (record.count > this.maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil((record.resetTime - now) / 1000)
            });
        }

        next();
    }
}

// ✅ Profile access rate limiter: 30 requests per minute
export const profileRateLimiter = new RateLimiter(60000, 30);

// ✅ Strict rate limiter: 5 requests per minute (for suspicious activity)
export const strictRateLimiter = new RateLimiter(60000, 5);

// Middleware functions
export const profileAccessLimiter = (req: Request, res: Response, next: NextFunction) => {
    profileRateLimiter.check(req, res, next);
};

export const strictAccessLimiter = (req: Request, res: Response, next: NextFunction) => {
    strictRateLimiter.check(req, res, next);
};
