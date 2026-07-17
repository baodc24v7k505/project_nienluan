import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/types/auth-user.type';

const CONVERSATION_INCLUDE = {
  customer: { select: { id: true, fullName: true, email: true } },
  shop: { select: { id: true, name: true, ownerId: true } },
  messages: { take: 1, orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrCreate(user: AuthUser, dto: CreateConversationDto) {
    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException('Chỉ khách hàng mới có thể bắt đầu cuộc trò chuyện');
    }

    if (dto.type === ConversationType.DIRECT) {
      if (!dto.shopId) throw new BadRequestException('Thiếu shopId');
      const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
      if (!shop) throw new NotFoundException('Không tìm thấy shop');

      const existing = await this.prisma.conversation.findUnique({
        where: {
          customerId_shopId_type: {
            customerId: user.id,
            shopId: dto.shopId,
            type: ConversationType.DIRECT,
          },
        },
        include: CONVERSATION_INCLUDE,
      });
      if (existing) return existing;

      return this.prisma.conversation.create({
        data: { type: ConversationType.DIRECT, customerId: user.id, shopId: dto.shopId },
        include: CONVERSATION_INCLUDE,
      });
    }

    const existingSupport = await this.prisma.conversation.findFirst({
      where: { customerId: user.id, type: ConversationType.SUPPORT },
      include: CONVERSATION_INCLUDE,
    });
    if (existingSupport) return existingSupport;

    return this.prisma.conversation.create({
      data: { type: ConversationType.SUPPORT, customerId: user.id },
      include: CONVERSATION_INCLUDE,
    });
  }

  async listMine(user: AuthUser) {
    let where: Record<string, unknown>;

    if (user.role === Role.CUSTOMER) {
      where = { customerId: user.id };
    } else if (user.role === Role.SELLER) {
      const shop = await this.prisma.shop.findUnique({ where: { ownerId: user.id } });
      if (!shop) return [];
      where = { shopId: shop.id };
    } else {
      where = { type: ConversationType.SUPPORT };
    }

    return this.prisma.conversation.findMany({
      where,
      include: CONVERSATION_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async authorize(user: AuthUser, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { shop: true },
    });
    if (!conversation) throw new NotFoundException('Không tìm thấy cuộc trò chuyện');

    const isCustomer = conversation.customerId === user.id;
    const isShopOwner = conversation.shop?.ownerId === user.id;
    const isSupportStaff =
      conversation.type === ConversationType.SUPPORT &&
      (user.role === Role.ADMIN || user.role === Role.STAFF);

    if (!isCustomer && !isShopOwner && !isSupportStaff) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc trò chuyện này');
    }
    return conversation;
  }

  async getMessages(user: AuthUser, conversationId: string, query: PaginationQueryDto) {
    await this.authorize(user, conversationId);
    const pageSize = query.pageSize ?? 50;

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
    });

    return messages.reverse();
  }

  async sendMessage(user: AuthUser, conversationId: string, body: string) {
    const conversation = await this.authorize(user, conversationId);

    const message = await this.prisma.message.create({
      data: { conversationId, senderId: user.id, body },
      include: { sender: { select: { id: true, fullName: true, role: true } } },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.realtimeGateway.emitToConversation(conversationId, 'message:new', message);

    await this.notifyRecipients(user, conversation, message.body);

    return message;
  }

  private async notifyRecipients(
    sender: AuthUser,
    conversation: { type: ConversationType; customerId: string; shop: { ownerId: string } | null },
    body: string,
  ) {
    const preview = body.length > 80 ? `${body.slice(0, 80)}...` : body;

    if (conversation.type === ConversationType.DIRECT && conversation.shop) {
      const recipientId =
        sender.id === conversation.customerId ? conversation.shop.ownerId : conversation.customerId;
      await this.notificationsService.create({
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'Tin nhắn mới',
        body: preview,
        link: '/chat',
      });
      return;
    }

    if (conversation.type === ConversationType.SUPPORT) {
      if (sender.id === conversation.customerId) {
        const staff = await this.prisma.user.findMany({
          where: { role: { in: [Role.ADMIN, Role.STAFF] } },
          select: { id: true },
        });
        await Promise.all(
          staff.map((s) =>
            this.notificationsService.create({
              userId: s.id,
              type: 'NEW_MESSAGE',
              title: 'Tin nhắn hỗ trợ mới',
              body: preview,
              link: '/admin/chat',
            }),
          ),
        );
      } else {
        await this.notificationsService.create({
          userId: conversation.customerId,
          type: 'NEW_MESSAGE',
          title: 'Phản hồi từ bộ phận hỗ trợ',
          body: preview,
          link: '/chat',
        });
      }
    }
  }
}
