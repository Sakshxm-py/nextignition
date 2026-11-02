import api from './api';

export const getOrCreateConversation = async (otherUserId: string, metadata?: Record<string, any>) => {
  const response = await api.post('/messaging/conversations', { otherUserId, metadata });
  return response.data;
};

export const getMessages = async (conversationId: string) => {
  const response = await api.get(`/messaging/conversations/${conversationId}/messages`);
  return response.data;
};

export const sendMessage = async (conversationId: string, content: string) => {
  const response = await api.post(`/messaging/conversations/${conversationId}/messages`, { content });
  return response.data;
};
