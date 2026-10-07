export interface IMessagingQuery {
  taskId?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface IChatQuery {
  recipientId: string;
  taskId?: string;
  cursor?: string;
  limit?: number;
}

export interface IReportMessagePayload {
  messageId: string;
  reason: string;
  note?: string;
}

export interface ISendMessagePayload {
  recipientId?: string;
  receiver?: string;
  recipientEmail?: string;
  text?: string;
  content?: string;
  taskId?: string;
  file?: File;
  documentKey?: string;
}
