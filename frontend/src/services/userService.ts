import api from './api';

export const getProfile = async (userId: string) => {
    const response = await api.get(`/auth/profile/${userId}`);
    return response.data;
};

export const updateProfile = async (profileData: any) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
};

export const uploadAvatar = async (file: File) => {
    const { data } = await api.post('/auth/avatar/upload-url', {
        fileName: file.name,
        contentType: file.type,
    });

    const signedUrl: string | undefined = data?.signedUrl;
    const publicUrl: string | undefined = data?.publicUrl;

    if (!signedUrl || !publicUrl) {
        throw new Error('Failed to get signed upload URL');
    }

    const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
    });

    if (!uploadRes.ok) {
        throw new Error('Failed to upload avatar');
    }

    await updateProfile({ avatar: publicUrl });
    return { avatar: publicUrl };
};

export const removeAvatar = async () => {
    const response = await api.delete('/auth/avatar');
    return response.data as { avatar: string };
};

export const uploadCoverPhoto = async (file: File) => {
    const { data } = await api.post('/auth/cover-photo/upload-url', {
        fileName: file.name,
        contentType: file.type,
    });

    const signedUrl: string | undefined = data?.signedUrl;
    const publicUrl: string | undefined = data?.publicUrl;

    if (!signedUrl || !publicUrl) {
        throw new Error('Failed to get signed upload URL');
    }

    const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
    });

    if (!uploadRes.ok) {
        throw new Error('Failed to upload cover photo');
    }

    await updateProfile({ coverPhoto: publicUrl });
    return { coverPhoto: publicUrl };
};

export const verifySocialLink = async (
    platformOrPayload:
        | string
        | { platform: 'linkedin' | 'twitter' | 'github' | 'instagram' | 'website'; url: string },
    url?: string
) => {
    const payload =
        typeof platformOrPayload === 'string'
            ? { platform: platformOrPayload, url: url || '' }
            : platformOrPayload;
    const response = await api.post('/auth/socials/verify', payload);
    return response.data as { verified?: boolean; message?: string; socials?: Record<string, string>; socialsVerified?: Record<string, boolean> };
};

export const uploadVideo = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    const response = await api.post('/auth/video', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data as { videoUrl: string };
};

export const getExpertStats = async () => {
    const response = await api.get('/auth/expert-stats');
    return response.data;
};

export const getFounderStats = async () => {
    const response = await api.get('/auth/founder-stats');
    return response.data;
};

export const getUsersByRole = async (role: 'founder' | 'expert' | 'investor', excludeUserId?: string) => {
    const response = await api.get('/auth/users', {
        params: {
            role,
            ...(excludeUserId ? { excludeUserId } : {}),
        },
    });
    return response.data;
};
