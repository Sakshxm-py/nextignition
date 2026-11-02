import api from './api';

export const createStartup = async (startupData: any) => {
    const response = await api.post('/startups', startupData);
    return response.data;
};

export const getMyStartups = async () => {
    const response = await api.get('/startups/my');
    return response.data;
};

export const fetchOrCreateMyStartup = async () => {
    const startups = await getMyStartups();
    if (startups && startups.length > 0) {
        return startups[0];
    }
    // Create an empty shell if no startup exists
    const newStartup = await createStartup({
        name: 'My New Startup',
        tagline: '',
        industry: [],
        stage: 'Ideation',
    });
    return newStartup;
};

export const getAllStartups = async () => {
    const response = await api.get('/startups');
    return response.data;
};

export const getStartupById = async (id: string) => {
    if (!id || id === 'undefined') throw new Error('Invalid startup ID');
    const response = await api.get(`/startups/${id}`);
    return response.data;
};

export const updateStartup = async (id: string, startupData: any) => {
    if (!id || id === 'undefined') return { message: 'Ignored undefined id' };
    const response = await api.put(`/startups/${id}`, startupData);
    return response.data;
};

export const uploadStartupLogo = async (startupId: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('startupId', startupId);
    const response = await api.post('/startups/logo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data as { logoUrl: string };
};

export const uploadStartupPitchDeck = async (startupId: string, file: File) => {
    const formData = new FormData();
    formData.append('pitchDeck', file);
    formData.append('startupId', startupId);
    const response = await api.post('/startups/pitch-deck', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data as { pitchDeckUrl: string };
};

export const upvoteStartup = async (id: string) => {
    const response = await api.post(`/startups/${id}/upvote`);
    return response.data;
};

export const addStartupComment = async (id: string, text: string) => {
    const response = await api.post(`/startups/${id}/comment`, { text });
    return response.data;
};
