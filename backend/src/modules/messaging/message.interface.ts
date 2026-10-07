import {
  MessageRegistryStatus,
  MessageReportStatus,
  User,
} from '@prisma/client';

export interface SendMessageInput {
  senderId: string;
  recipientId: string;
  text?: string;
  document?: string;
  taskId?: string | null;
}

export interface CreateMessageJobData {
  senderId: string;
  recipientId: string;
  text?: string;
  document?: string;
  taskId?: string;
}

export interface SocketMessagePayload {
  recipientId?: string;
  recipientEmail?: string;
  text?: string;
  document?: string;
  taskId?: string;
}

export interface MultipartSendBody {
  data?: string;
  recipientId?: string;
  receiver?: string;
  recipientEmail?: string;
  text?: string;
  content?: string;
  taskId?: string;
  documentKey?: string;
}

export interface ClientMeta {
  userId: string;
  sessionId: string;
}

export interface MessageRealtimeShape {
  id: string;
  senderId: string;
  recipientId: string;
  taskId?: string | null;
  registryStatus?: MessageRegistryStatus;
  reportCount?: number;
  latestReportId?: string | null;
  isManualOverride?: boolean;
}

export type MessagingRealtimeEvent =
  | {
      event: 'message.created';
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      message: unknown;
    }
  | {
      event: 'message.deleted';
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      messageId: string;
    }
  | {
      event: 'message.registry_updated';
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      messageId: string;
      registryStatus: 'VERIFIED' | 'FLAGGED' | 'RESTRICTED';
    }
  | {
      event: 'message.reported';
      senderId: string;
      recipientId: string;
      taskId?: string | null;
      messageId: string;
      reportId: string;
    };

export type UserIdentity = Pick<User, 'id' | 'email' | 'status' | 'isDeleted'>;

export interface GetAdminRegistryQuery {
  page?: number;
  limit?: number;
  recordType?: string;
  registryStatus?: string;
  contextType?: string;
  taskId?: string;
  senderId?: string;
  recipientId?: string;
  senderEmail?: string;
  recipientEmail?: string;
  hasFile?: string;
  reportedOnly?: string;
  reportCount?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetAdminMessageReportsQuery {
  status?: string;
  reporterId?: string;
  messageId?: string;
  reason?: string;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface GetMessagesListOptions {
  taskId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface ChatHistoryMeta {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ReviewMessageReportPayload {
  status: MessageReportStatus;
  reviewNote?: string;
}
