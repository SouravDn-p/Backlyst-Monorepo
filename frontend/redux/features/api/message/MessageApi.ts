import { baseApi } from "../baseApi";
import { ApiResponse, ApiPaginatedResponse } from "@/types/response";
import {
    IMessagingQuery,
    IChatQuery,
    IReportMessagePayload,
    ISendMessagePayload,
} from "@/types/message/MessageType";

export const messageApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUserMessages: builder.query<ApiPaginatedResponse<any, any>, IMessagingQuery>({
            query: (arg) => {
                const params: Record<string, any> = {};
                Object.entries(arg).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params[key] = value;
                    }
                });

                return {
                    url: `/messaging`,
                    method: "GET",
                    params,
                };
            },
        }),
        getRecipientChat: builder.query<ApiResponse<any>, IChatQuery>({
            query: ({ recipientId, ...arg }) => {
                const params: Record<string, any> = {};
                Object.entries(arg).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params[key] = value;
                    }
                });

                return {
                    url: `/messaging/chat/${recipientId}`,
                    method: "GET",
                    params,
                };
            },
            providesTags: ["Message"],
        }),

        deleteMessage: builder.mutation<ApiResponse<any>, string>({
            query: (messageId) => ({
                url: `/messaging/delete/${messageId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Message"],
        }),

        reportMessage: builder.mutation<ApiResponse<any>, IReportMessagePayload>({
            query: ({ messageId, ...body }) => ({
                url: `/messaging/messages/${messageId}/report`,
                method: "POST",
                body,
            }),
        }),

        sendMessageAndFile: builder.mutation<ApiResponse<any>, ISendMessagePayload>({
            query: (arg) => {
                // Per API docs §6: POST /messaging/send accepts JSON.
                // Files must be uploaded to S3 first; send the returned `documentKey` here.
                // Fields: recipientId (required), text, documentKey, taskId
                const { file, ...restArg } = arg;
                const body: Record<string, any> = {};

                Object.entries(restArg).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        body[key] = value;
                    }
                });

                return {
                    url: `/messaging/send`,
                    method: "POST",
                    body,
                };
            },
        }),
    }),
});

export const {
    useGetUserMessagesQuery,
    useGetRecipientChatQuery,
    useDeleteMessageMutation,
    useReportMessageMutation,
    useSendMessageAndFileMutation,
} = messageApi;
