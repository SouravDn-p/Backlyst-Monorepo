import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { Server, WebSocket } from 'ws';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from 'src/types';
import {
  NotificationPubSubService,
  NotificationRealtimeEvent,
} from './notification-pubsub.service';
import { NotificationSocketMeta } from './types/notification.types';

@WebSocketGateway({ path: '/notifications', cors: { origin: '*' } })
export class NotificationGateway implements OnModuleInit {
  @WebSocketServer() server: Server;

  private readonly clientsByUserId = new Map<string, Set<WebSocket>>();
  private readonly clientsBySession = new Map<string, Set<WebSocket>>();
  private readonly metaByClient = new Map<WebSocket, NotificationSocketMeta>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationPubSubService: NotificationPubSubService,
  ) {}

  onModuleInit() {
    // Local socket maps are instance-local only. Redis Pub/Sub distributes
    // notification events to every app instance for local-only WSS emission.
    this.notificationPubSubService.onEvent((event) =>
      this.handleRealtimeEvent(event),
    );
  }

  private normalizeSocketToken(token: string): string {
    return token.replace(/^bearer\s+/i, '').trim();
  }

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const parsedUrl = new URL(request.url ?? '', 'http://localhost');
    const rawToken = parsedUrl.searchParams.get('token');

    if (!rawToken) {
      client.close(4001, 'Token missing');
      return;
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        this.normalizeSocketToken(rawToken),
        { secret: this.configService.getOrThrow<string>('JWT_SECRET') },
      );
    } catch {
      client.close(4001, 'Invalid token');
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, status: true, isDeleted: true },
    });

    if (!user || user.isDeleted || user.status !== 'ACTIVE') {
      client.close(4001, 'User not active');
      return;
    }

    const meta: NotificationSocketMeta = {
      userId: user.id,
      sessionId: payload.sessionId,
    };

    this.metaByClient.set(client, meta);

    const userClients = this.clientsByUserId.get(user.id) ?? new Set();
    userClients.add(client);
    this.clientsByUserId.set(user.id, userClients);

    const sessionClients =
      this.clientsBySession.get(payload.sessionId) ?? new Set();
    sessionClients.add(client);
    this.clientsBySession.set(payload.sessionId, sessionClients);
  }

  handleDisconnect(client: WebSocket) {
    const meta = this.metaByClient.get(client);
    if (!meta) return;

    const userClients = this.clientsByUserId.get(meta.userId);
    if (userClients) {
      userClients.delete(client);
      if (userClients.size === 0) this.clientsByUserId.delete(meta.userId);
    }

    const sessionClients = this.clientsBySession.get(meta.sessionId);
    if (sessionClients) {
      sessionClients.delete(client);
      if (sessionClients.size === 0)
        this.clientsBySession.delete(meta.sessionId);
    }

    this.metaByClient.delete(client);
  }

  private handleRealtimeEvent(event: NotificationRealtimeEvent) {
    if (event.event === 'notification.created') {
      this.emitToUser(
        event.recipientId,
        'notification:new',
        event.notification,
      );
      this.emitToUser(event.recipientId, 'notification:unread_count', {
        count: event.unreadCount,
      });
      return;
    }

    if (event.event === 'notification.read') {
      this.emitToUser(event.recipientId, 'notification:read', {
        notificationId: event.notificationId,
      });
      this.emitToUser(event.recipientId, 'notification:unread_count', {
        count: event.unreadCount,
      });
      return;
    }

    if (event.event === 'notification.read_all') {
      this.emitToUser(event.recipientId, 'notification:read_all', {
        count: event.updatedCount,
      });
      this.emitToUser(event.recipientId, 'notification:unread_count', {
        count: event.unreadCount,
      });
    }
  }

  emitToUser(userId: string, event: string, data: unknown): boolean {
    const clients = this.clientsByUserId.get(userId);
    if (!clients || clients.size === 0) return false;

    let emitted = false;
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
        emitted = true;
      }
    }

    return emitted;
  }

  disconnectSession(sessionId: string, reason = 'Logged out') {
    const sessionClients = this.clientsBySession.get(sessionId);
    if (!sessionClients || sessionClients.size === 0) return;

    for (const client of [...sessionClients]) {
      if (client.readyState === WebSocket.OPEN) {
        client.close(4000, reason);
      }
      this.handleDisconnect(client);
    }
  }
}
