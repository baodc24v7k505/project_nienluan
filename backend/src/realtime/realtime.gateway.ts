import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface SocketData {
  userId: string;
  role: Role;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Thiếu access token');

      const payload = this.jwtService.verify<{ id: string; role: Role }>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const data: SocketData = { userId: payload.id, role: payload.role };
      client.data = data;
      client.join(`user:${payload.id}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(client: Socket, data: { conversationId: string }) {
    const { userId, role } = client.data as SocketData;
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { shop: true },
    });
    if (!conversation) return;

    const isCustomer = conversation.customerId === userId;
    const isShopOwner = conversation.shop?.ownerId === userId;
    const isSupportStaff =
      conversation.type === 'SUPPORT' && (role === Role.ADMIN || role === Role.STAFF);

    if (isCustomer || isShopOwner || isSupportStaff) {
      client.join(`conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(client: Socket, data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
