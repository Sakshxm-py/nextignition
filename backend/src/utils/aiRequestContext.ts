import { AuthRequest } from '../middleware/auth';

export type AiClientContext = {
    currentPage?: string;
    sessionFlags?: Record<string, boolean>;
};

const sanitizeText = (value: unknown, maxLen: number) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.slice(0, maxLen);
};

const sanitizeSessionFlags = (value: unknown, maxKeys = 25) => {
    if (!value || typeof value !== 'object') return {} as Record<string, boolean>;

    const entries = Object.entries(value as Record<string, unknown>)
        .slice(0, maxKeys)
        .map(([key, flag]) => [sanitizeText(key, 64), Boolean(flag)] as const)
        .filter(([key]) => Boolean(key));

    return Object.fromEntries(entries);
};

export const extractClientContext = (req: AuthRequest): AiClientContext => {
    const body = (req.body || {}) as Record<string, unknown>;
    const raw = body.clientContext as unknown;
    if (!raw || typeof raw !== 'object') {
        return {};
    }

    const ctx = raw as Record<string, unknown>;
    const currentPage = sanitizeText(ctx.currentPage, 256);
    const sessionFlags = sanitizeSessionFlags(ctx.sessionFlags);

    return {
        currentPage: currentPage || undefined,
        sessionFlags: Object.keys(sessionFlags).length ? sessionFlags : undefined,
    };
};

export const formatAiRequestContext = (req: AuthRequest) => {
    const userId = sanitizeText(req.user?.id, 128);
    const role = sanitizeText(req.user?.role, 64);

    const clientContext = extractClientContext(req);

    const lines: string[] = [];
    lines.push('Request context:');
    if (userId) lines.push(`- userId: ${userId}`);
    if (role) lines.push(`- role: ${role}`);
    lines.push(`- method: ${sanitizeText(req.method, 16) || 'N/A'}`);
    lines.push(`- path: ${sanitizeText(req.originalUrl || req.path, 256) || 'N/A'}`);

    if (clientContext.currentPage) {
        lines.push(`- currentPage: ${clientContext.currentPage}`);
    }

    if (clientContext.sessionFlags && Object.keys(clientContext.sessionFlags).length) {
        const flags = Object.entries(clientContext.sessionFlags)
            .map(([key, value]) => `${key}=${value ? 'true' : 'false'}`)
            .join(', ');
        lines.push(`- sessionFlags: ${flags}`);
    }

    return {
        clientContext,
        contextText: lines.join('\n'),
    };
};
