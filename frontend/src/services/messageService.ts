import api from './api';

export const sendMessage = async (receiverId: string, content: string, type: 'text' | 'file' | 'image' = 'text', fileUrl?: string) => {
    const response = await api.post('/messages/send', { receiverId, content, type, fileUrl });
    return response.data;
};

export const getConversations = async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
};

export const getMessages = async (conversationId: string) => {
    const response = await api.get(`/messages/${conversationId}`);
    return response.data;
};

export const markConversationAsRead = async (conversationId: string) => {
    const response = await api.put(`/messages/${conversationId}/read`);
    return response.data;
};
