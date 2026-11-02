import api from './api';

const getClientContext = () => {
    const currentPage = typeof window !== 'undefined' ? window.location.pathname : undefined;
    return {
        currentPage,
    };
};

export const generateSummary = async (idea: string) => {
    const response = await api.post('/ignition/summary', { idea, clientContext: getClientContext() });
    return response.data;
};

export const aiChat = async (
    message: string,
    conversationHistory?: { role: string; content: string }[],
    preferences?: { responseStyle?: string; aiPersonality?: string }
) => {
    const response = await api.post('/ignition/chat', { message, conversationHistory, preferences, clientContext: getClientContext() });
    return response.data;
};

export const summarizeUserProfile = async (profileText?: string) => {
    const response = await api.post('/ignition/profile', { profileText, clientContext: getClientContext() });
    return response.data;
};

export const analyzePitchDeck = async (file: File) => {
    const formData = new FormData();
    formData.append('pitchDeck', file);
    const response = await api.post('/ignition/pitch-deck', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const enhancePrompt = async (prompt: string) => {
    const response = await api.post('/ignition/enhance-prompt', { prompt, clientContext: getClientContext() });
    return response.data as { enhanced?: string };
};

export const enhancePostContent = async (content: string) => {
    const response = await api.post('/ignition/enhance-post', { content, clientContext: getClientContext() });
    return response.data;
};

export const runQuickAction = async (action: string, context?: string) => {
    const response = await api.post('/ignition/quick-action', { action, context, clientContext: getClientContext() });
    return response.data;
};

export const matchCofounders = async (payload?: {
    skills?: string[];
    location?: string;
    commitment?: string;
    startupStatus?: string;
}) => {
    const response = await api.post('/ignition/match-cofounders', { ...(payload || {}), clientContext: getClientContext() });
    return response.data;
};

export const matchExperts = async (payload?: {
    needs?: string;
    industry?: string;
    stage?: string;
    location?: string;
}) => {
    const response = await api.post('/ignition/match-experts', { ...(payload || {}), clientContext: getClientContext() });
    return response.data;
};

export const matchClients = async (payload?: {
    industry?: string;
    stage?: string;
}) => {
    const response = await api.post('/ignition/match-clients', { ...(payload || {}), clientContext: getClientContext() });
    return response.data;
};

export const fetchDeckInsights = async () => {
    const response = await api.post('/ignition/deck-insights', { clientContext: getClientContext() });
    return response.data;
};

export const generatePortfolioAnalysis = async (portfolioData: any[]) => {
    const response = await api.post('/ignition/portfolio-analysis', { 
        portfolioData, 
        clientContext: getClientContext() 
    });
    return response.data;
};

export const toggleSaveAiSession = async (sessionId: string | number) => {
    const response = await api.post(`/ignition/save-session/${sessionId}`);
    return response.data;
};

export const getSavedAiSessions = async () => {
    const response = await api.get('/ignition/saved-sessions');
    return response.data;
};
