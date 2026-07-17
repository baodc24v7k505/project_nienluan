export type ConversationType = 'DIRECT' | 'SUPPORT';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; fullName: string; role: string };
}

export interface Conversation {
  id: string;
  type: ConversationType;
  customerId: string;
  shopId: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; fullName: string; email: string };
  shop: { id: string; name: string; ownerId: string } | null;
  messages: Message[];
}
