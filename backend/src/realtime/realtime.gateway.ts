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
  tokenVersion: number;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('Thiếu access token');

      const payload = this.jwtService.verify<{
        id: string;
        role: Role;
        exp: number;
        tokenVersion?: number;
      }>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });
      if (
        !user ||
        user.status !== 'ACTIVE' ||
        user.tokenVersion !== (payload.tokenVersion ?? 0)
      )
        throw new Error('Phiên không khả dụng');
      const data: SocketData = {
        userId: user.id,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };
      client.data = data;
      await client.join(`user:${payload.id}`);
      const timer = setTimeout(
        () => client.disconnect(true),
        Math.max(1, payload.exp * 1000 - Date.now()),
      );
      timer.unref();
      client.once('disconnect', () => clearTimeout(timer));
      client.use((_packet, next) => {
        void (async () => {
          const current = await this.prisma.user
            .findUnique({ where: { id: user.id } })
            .catch(() => null);
          if (
            !current ||
            current.status !== 'ACTIVE' ||
            current.tokenVersion !== user.tokenVersion
          ) {
            client.disconnect(true);
            return;
          }
          next();
        })().catch(() => client.disconnect(true));
      });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    client: Socket,
    data: { conversationId: string },
  ) {
    if (
      !(client.data as SocketData)?.userId ||
      typeof data?.conversationId !== 'string'
    )
      return;
    const { userId, role } = client.data as SocketData;
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { shop: true },
    });
    if (!conversation) return;

    const isCustomer = conversation.customerId === userId;
    const isShopOwner = conversation.shop?.ownerId === userId;
    const isSupportStaff =
      conversation.type === 'SUPPORT' &&
      (role === Role.ADMIN || role === Role.STAFF);

    if (isCustomer || isShopOwner || isSupportStaff) {
      await client.join(`conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(client: Socket, data: { conversationId: string }) {
    if (typeof data?.conversationId !== 'string') return;
    void client.leave(`conversation:${data.conversationId}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.safeEmit(`user:${userId}`, event, payload);
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.safeEmit(`conversation:${conversationId}`, event, payload);
  }
  private safeEmit(room: string, event: string, payload: unknown) {
    if (!this.server) return;
    void (async () => {
      const sockets = await this.server.in(room).fetchSockets();
      const users = await this.prisma.user.findMany({
        where: {
          id: { in: sockets.map((s) => (s.data as SocketData).userId) },
          status: 'ACTIVE',
        },
        select: { id: true, tokenVersion: true },
      });
      for (const socket of sockets) {
        if (
          users.some(
            (u) =>
              u.id === (socket.data as SocketData).userId &&
              u.tokenVersion === (socket.data as SocketData).tokenVersion,
          )
        )
          socket.emit(event, payload);
        else socket.disconnect(true);
      }
    })().catch((e) => this.logger.error(e));
  }
}
