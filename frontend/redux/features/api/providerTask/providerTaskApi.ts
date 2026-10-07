import { baseApi } from "../baseApi";
import type {
  ApplyToProviderTaskRequest,
  ApplyToProviderTaskResponse,
  GetProviderTaskDetailResponse,
  ProviderDeadlineStatusResponse,
  GetProviderOpportunitiesRequest,
  GetProviderOpportunitiesResponse,
  GetProviderTasksRequest,
  GetProviderTasksResponse,
  RespondProviderCancelRequest,
  RespondProviderCancelResponse,
  StartProviderTaskWorkRequest,
  StartProviderTaskWorkResponse,
  SubmitProviderTaskRequest,
  SubmitProviderTaskResponse,
  RequestProviderDeadlineExtensionRequest,
  RequestProviderDeadlineExtensionResponse,
} from "@/types/providerTask/providerTaskTypes";

export const providerTaskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProviderOpportunities: builder.query<
      GetProviderOpportunitiesResponse,
      GetProviderOpportunitiesRequest
    >({
      query: (params) => ({
        url: "/provider-task/opportunities",
        method: "GET",
        params,
      }),
      keepUnusedDataFor: 120,
      providesTags: (result) => {
        const items = result?.data?.items ?? result?.data?.data ?? [];

        return items.length
          ? [
              { type: "ProviderOpportunity", id: "LIST" },
              ...items.map((task) => ({
                type: "ProviderOpportunity" as const,
                id: task.id,
              })),
            ]
          : [{ type: "ProviderOpportunity", id: "LIST" }];
      },
    }),

    getProviderTaskDetail: builder.query<GetProviderTaskDetailResponse, string>({
      query: (taskId) => ({
        url: `/provider-task/provider/${taskId}`,
        method: "GET",
      }),
      keepUnusedDataFor: 120,
      providesTags: (_result, _error, taskId) => [
        { type: "ProviderOpportunity", id: taskId },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    applyToProviderTask: builder.mutation<
      ApplyToProviderTaskResponse,
      ApplyToProviderTaskRequest
    >({
      query: ({ taskId, ...body }) => ({
        url: `/provider-task/${taskId}/apply`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderOpportunity", id: "LIST" },
        { type: "ProviderOpportunity", id: taskId },
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    getProviderTasks: builder.query<
      GetProviderTasksResponse,
      GetProviderTasksRequest
    >({
      query: (params) => ({
        url: "/provider-task/tasks",
        method: "GET",
        params,
      }),
      keepUnusedDataFor: 120,
      providesTags: (result) => {
        const items = result?.data?.items ?? result?.data?.data ?? [];

        return items.length
          ? [
              { type: "ProviderTask", id: "LIST" },
              ...items.map((task) => ({
                type: "ProviderTask" as const,
                id: task.id,
              })),
            ]
          : [{ type: "ProviderTask", id: "LIST" }];
      },
    }),

    getProviderDeadlineStatus: builder.query<ProviderDeadlineStatusResponse, void>({
      query: () => ({
        url: "/provider-task/deadline-status",
        method: "GET",
      }),
      keepUnusedDataFor: 120,
      providesTags: [{ type: "ProviderTask", id: "DEADLINE_STATUS" }],
    }),

    startProviderTaskWork: builder.mutation<
      StartProviderTaskWorkResponse,
      StartProviderTaskWorkRequest
    >({
      query: ({ taskId }) => ({
        url: `/provider-task/${taskId}/start-work`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    submitProviderTask: builder.mutation<
      SubmitProviderTaskResponse,
      SubmitProviderTaskRequest
    >({
      query: ({ taskId, data, files = [] }) => {
        const formData = new FormData();

        formData.append("deliveryMessage", data.deliveryMessage);

        if (data.proofUrl) {
          formData.append("proofUrl", data.proofUrl);
        }

        if (data.additionalNotes) {
          formData.append("additionalNotes", data.additionalNotes);
        }

        if (data.finalTaskType) {
          formData.append("finalTaskType", data.finalTaskType);
        }

        files.forEach((file) => {
          formData.append("files", file);
        });

        return {
          url: `/provider-task/${taskId}/submit`,
          method: "PATCH",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    resubmitProviderTask: builder.mutation<
      SubmitProviderTaskResponse,
      SubmitProviderTaskRequest
    >({
      query: ({ taskId, data, files = [] }) => {
        const formData = new FormData();

        formData.append("deliveryMessage", data.deliveryMessage);

        if (data.proofUrl) {
          formData.append("proofUrl", data.proofUrl);
        }

        if (data.additionalNotes) {
          formData.append("additionalNotes", data.additionalNotes);
        }

        if (data.finalTaskType) {
          formData.append("finalTaskType", data.finalTaskType);
        }

        files.forEach((file) => {
          formData.append("files", file);
        });

        return {
          url: `/provider-task/${taskId}/resubmit`,
          method: "PATCH",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    respondProviderCancelRequest: builder.mutation<
      RespondProviderCancelResponse,
      RespondProviderCancelRequest
    >({
      query: ({ taskId, action, note }) => ({
        url: `/provider-task/${taskId}/respond-cancel-request`,
        method: "PATCH",
        body: note ? { action, note } : { action },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
        { type: "ProviderTask", id: "DEADLINE_STATUS" },
      ],
    }),

    requestProviderDeadlineExtension: builder.mutation<
      RequestProviderDeadlineExtensionResponse,
      RequestProviderDeadlineExtensionRequest
    >({
      query: ({ taskId, ...body }) => ({
        url: `/provider-task/${taskId}/deadline-extension-request`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "ProviderTask", id: "LIST" },
        { type: "ProviderTask", id: taskId },
        { type: "ProviderTask", id: "DEADLINE_STATUS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useApplyToProviderTaskMutation,
  useGetProviderDeadlineStatusQuery,
  useGetProviderOpportunitiesQuery,
  useGetProviderTaskDetailQuery,
  useGetProviderTasksQuery,
  useRespondProviderCancelRequestMutation,
  useResubmitProviderTaskMutation,
  useStartProviderTaskWorkMutation,
  useSubmitProviderTaskMutation,
  useRequestProviderDeadlineExtensionMutation,
} = providerTaskApi;
