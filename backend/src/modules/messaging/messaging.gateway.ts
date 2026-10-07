import { BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { IncomingMessage } from 'http';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from 'src/types';
import { Server, WebSocket } from 'ws';
import { MessagingProducer } from './messaging.producer';
import { MessagingPubSubService } from './messaging-pubsub.service';
import { ClientMeta, MessagingRealtimeEvent } from './message.interface';
import type { SocketMessagePayload } from './message.interface';

@WebSocketGateway({ cors: { origin: '*' } })
export class MessagingGateway implements OnModuleInit {
  @WebSocketServer() server: Server;

  private readonly clientsByUserId = new Map<string, Set<WebSocket>>();
  private readonly clientsBySession = new Map<string, Set<WebSocket>>();
  private readonly metaByClient = new Map<WebSocket, ClientMeta>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly messagingProducer: MessagingProducer,
    private readonly messagingPubSubService: MessagingPubSubService,
  ) {}

  onModuleInit() {
    // Local socket maps are instance-local only.
    // Redis Pub/Sub distributes messaging events across app instances,
    // and each gateway emits only to sockets connected to this instance.
    this.messagingPubSubService.onEvent((event) =>
      this.handleRealtimeEvent(event),
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeSocketToken(token: string): string {
    return token.replace(/^bearer\s+/i, '').trim();
  }

  private async resolveRecipientId(payload: SocketMessagePayload) {
    if (payload.recipientId && !this.isUuid(payload.recipientId)) {
      throw new BadRequestException('recipientId must be a valid UUID');
    }

    if (payload.recipientId && this.isUuid(payload.recipientId)) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.recipientId },
        select: { id: true, status: true, isDeleted: true },
      });

      if (!user || user.isDeleted || user.status !== 'ACTIVE') {
        throw new BadRequestException('Receiver not found');
      }

      return user.id;
    }

    if (payload.recipientEmail) {
      const user = await this.prisma.user.findUnique({
        where: { email: payload.recipientEmail },
        select: { id: true, status: true, isDeleted: true },
      });

      if (!user || user.isDeleted || user.status !== 'ACTIVE') {
        throw new BadRequestException('Receiver not found');
      }

      return user.id;
    }

    throw new BadRequestException('recipientId is required');
  }

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const parsedUrl = new URL(request.url ?? '', 'http://localhost');
    const rawToken = parsedUrl.searchParams.get('token');

    if (!rawToken) {
      client.close(4001, 'Token missing');
      return;
    }

    const token = this.normalizeSocketToken(rawToken);

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
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

    const meta: ClientMeta = {
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
    if (!meta) {
      return;
    }

    const userClients = this.clientsByUserId.get(meta.userId);
    if (userClients) {
      userClients.delete(client);
      if (userClients.size === 0) {
        this.clientsByUserId.delete(meta.userId);
      }
    }

    const sessionClients = this.clientsBySession.get(meta.sessionId);
    if (sessionClients) {
      sessionClients.delete(client);
      if (sessionClients.size === 0) {
        this.clientsBySession.delete(meta.sessionId);
      }
    }

    this.metaByClient.delete(client);
  }

  @SubscribeMessage('message')
  async onMessage(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() payload: SocketMessagePayload,
  ) {
    try {
      const senderId = this.metaByClient.get(client)?.userId;
      if (!senderId) {
        client.close(4001, 'User not found');
        return;
      }

      const hasText = Boolean(payload.text?.trim());
      const hasDocument = Boolean(payload.document?.trim());
      if (!hasText && !hasDocument) {
        throw new BadRequestException('Message text or file is required');
      }

      const recipientId = await this.resolveRecipientId(payload);

      await this.messagingProducer.enqueueCreateMessage({
        senderId,
        recipientId,
        text: hasText ? payload.text?.trim() : undefined,
        document: hasDocument ? payload.document?.trim() : undefined,
        taskId: payload.taskId,
      });
    } catch (error) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            event: 'message:error',
            data: {
              message:
                error instanceof Error
                  ? error.message
                  : 'Failed to send message',
            },
          }),
        );
      }
    }
  }

  private handleRealtimeEvent(event: MessagingRealtimeEvent) {
    if (event.event === 'message.created') {
      this.emitToUser(event.senderId, 'message', event.message);
      this.emitToUser(event.recipientId, 'message', event.message);
      return;
    }

    if (event.event === 'message.deleted') {
      const payload = {
        messageId: event.messageId,
        taskId: event.taskId ?? null,
      };
      this.emitToUser(event.senderId, 'message:deleted', payload);
      this.emitToUser(event.recipientId, 'message:deleted', payload);
      return;
    }

    if (event.event === 'message.registry_updated') {
      const payload = {
        messageId: event.messageId,
        taskId: event.taskId ?? null,
        registryStatus: event.registryStatus,
      };
      this.emitToUser(event.senderId, 'message:registry_updated', payload);
      this.emitToUser(event.recipientId, 'message:registry_updated', payload);
      return;
    }

    if (event.event === 'message.reported') {
      const payload = {
        messageId: event.messageId,
        reportId: event.reportId,
        taskId: event.taskId ?? null,
      };
      this.emitToUser(event.senderId, 'message:reported', payload);
      this.emitToUser(event.recipientId, 'message:reported', payload);
    }
  }

  public emitToUser(userId: string, event: string, data: unknown) {
    const clients = this.clientsByUserId.get(userId);
    if (!clients || clients.size === 0) {
      return;
    }

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ event, data }));
      }
    }
  }

  public disconnectSession(sessionId: string, reason = 'Logged out') {
    const sessionClients = this.clientsBySession.get(sessionId);
    if (!sessionClients || sessionClients.size === 0) {
      return;
    }

    for (const client of [...sessionClients]) {
      if (client.readyState === WebSocket.OPEN) {
        client.close(4000, reason);
      }
      this.handleDisconnect(client);
    }
  }
}
