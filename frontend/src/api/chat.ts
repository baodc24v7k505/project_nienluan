import { apiClient } from './client';
import type { Conversation, ConversationType, Message } from '../types/chat';

export async function listMyConversations() {
  const res = await apiClient.get<Conversation[]>('/conversations');
  return res.data;
}

export async function getOrCreateConversation(type: ConversationType, shopId?: string) {
  const res = await apiClient.post<Conversation>('/conversations', { type, shopId });
  return res.data;
}

export async function getMessages(conversationId: string) {
  const res = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`);
  return res.data;
}

export async function sendMessage(conversationId: string, body: string) {
  const res = await apiClient.post<Message>(`/conversations/${conversationId}/messages`, { body });
  return res.data;
}
