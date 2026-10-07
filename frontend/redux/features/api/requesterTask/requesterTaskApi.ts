import { baseApi } from "../baseApi";
import type {
  GetMyWebsitesRequest,
  GetMyWebsitesResponse,
} from "@/types/website/websiteTypes";
import type {
  CancelRequesterTaskRequest,
  CancelRequesterTaskResponse,
  CreateRequesterTaskRequest,
  CreateRequesterTaskResponse,
  GetRequesterTaskApplicantsRequest,
  GetRequesterTaskApplicantsResponse,
  GetRequesterTaskResponse,
  GetRequesterTaskTimelineResponse,
  GetRequesterTasksRequest,
  GetRequesterTasksResponse,
  ReviewRequesterTaskRequest,
  ReviewRequesterTaskResponse,
  RequesterMozStatsRequest,
  RequesterMozStatsResponse,
  SelectRequesterTaskProviderRequest,
  SelectRequesterTaskProviderResponse,
  SubmitQualityRubricRequest,
  SubmitQualityRubricResponse,
  UpdateRequesterTaskDeadlineRequest,
  UpdateRequesterTaskDeadlineResponse,
  RespondRequesterDeadlineExtensionRequest,
  RespondRequesterDeadlineExtensionResponse,
} from "@/types/requesterTask/requesterTaskTypes";

export const requesterTaskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRequesterMyWebsites: builder.query<
      GetMyWebsitesResponse,
      GetMyWebsitesRequest
    >({
      query: (params) => ({
        url: "/website/my-websites",
        method: "GET",
        params,
      }),
      keepUnusedDataFor: 300,
      providesTags: (result) =>
        result?.data?.data?.length
          ? [
            { type: "RequesterWebsite", id: "LIST" },
            ...result.data.data.map((website) => ({
              type: "RequesterWebsite" as const,
              id: website.id,
            })),
          ]
          : [{ type: "RequesterWebsite", id: "LIST" }],
    }),

    createRequesterTask: builder.mutation<
      CreateRequesterTaskResponse,
      CreateRequesterTaskRequest
    >({
      query: ({ data, files = [] }) => {
        const formData = new FormData();

        formData.append("data", JSON.stringify(data));

        files.forEach((file) => {
          formData.append("files", file);
        });

        return {
          url: "/task-requester",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterWebsite", id: "LIST" },
      ],
    }),

    getRequesterMozStats: builder.mutation<
      RequesterMozStatsResponse,
      RequesterMozStatsRequest
    >({
      query: (body) => ({
        url: "/task-requester/moz-stats",
        method: "POST",
        body,
      }),
    }),

    getRequesterTasks: builder.query<
      GetRequesterTasksResponse,
      GetRequesterTasksRequest
    >({
      query: (params) => ({
        url: "/task-requester/my-tasks",
        method: "GET",
        params,
      }),
      providesTags: (result) =>
        result?.data?.items?.length
          ? [
            { type: "RequesterTask", id: "LIST" },
            ...result.data.items.map((task) => ({
              type: "RequesterTask" as const,
              id: task.id,
            })),
          ]
          : [{ type: "RequesterTask", id: "LIST" }],
    }),

    getRequesterTask: builder.query<GetRequesterTaskResponse, string>({
      query: (taskId) => ({
        url: `/task-requester/${taskId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, taskId) => [
        { type: "RequesterTask", id: taskId },
      ],
    }),

    getRequesterTaskApplicants: builder.query<
      GetRequesterTaskApplicantsResponse,
      GetRequesterTaskApplicantsRequest
    >({
      query: ({ taskId, ...params }) => ({
        url: `/task-requester/${taskId}/applicants`,
        method: "GET",
        params,
      }),
      providesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: taskId },
      ],
    }),

    selectRequesterTaskProvider: builder.mutation<
      SelectRequesterTaskProviderResponse,
      SelectRequesterTaskProviderRequest
    >({
      query: ({ taskId, applicationId }) => ({
        url: `/task-requester/${taskId}/select-provider`,
        method: "PATCH",
        body: { applicationId },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterTask", id: taskId },
      ],
    }),

    getRequesterTaskTimeline: builder.query<
      GetRequesterTaskTimelineResponse,
      string
    >({
      query: (taskId) => ({
        url: `/task-requester/${taskId}/timeline`,
        method: "GET",
      }),
      providesTags: (_result, _error, taskId) => [
        { type: "RequesterTask", id: taskId },
      ],
    }),

    reviewRequesterTask: builder.mutation<
      ReviewRequesterTaskResponse,
      ReviewRequesterTaskRequest
    >({
      query: ({ taskId, action, note }) => ({
        url: `/task-requester/${taskId}/review`,
        method: "PATCH",
        body: {
          action,
          note,
        },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterTask", id: taskId },
      ],
    }),

    cancelRequesterTask: builder.mutation<
      CancelRequesterTaskResponse,
      CancelRequesterTaskRequest
    >({
      query: ({ taskId, note }) => ({
        url: `/task-requester/${taskId}/cancel`,
        method: "PATCH",
        body: note ? { note } : {},
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterTask", id: taskId },
      ],
    }),

    updateRequesterTaskDeadline: builder.mutation<
      UpdateRequesterTaskDeadlineResponse,
      UpdateRequesterTaskDeadlineRequest
    >({
      query: ({ taskId, requestedDeadlineDays }) => ({
        url: `/task-requester/${taskId}/deadline`,
        method: "PATCH",
        body: { requestedDeadlineDays },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterTask", id: taskId },
      ],
    }),

    submitQualityRubric: builder.mutation<
      SubmitQualityRubricResponse,
      SubmitQualityRubricRequest
    >({
      query: ({ taskId, ...body }) => ({
        url: `/task-requester/${taskId}/quality-rubric`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: taskId },
      ],
    }),

    respondRequesterDeadlineExtension: builder.mutation<
      RespondRequesterDeadlineExtensionResponse,
      RespondRequesterDeadlineExtensionRequest
    >({
      query: ({ taskId, requestId, action, note }) => ({
        url: `/task-requester/${taskId}/deadline-extension-requests/${requestId}/respond`,
        method: "PATCH",
        body: note ? { action, note } : { action },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "RequesterTask", id: "LIST" },
        { type: "RequesterTask", id: taskId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateRequesterTaskMutation,
  useGetRequesterMyWebsitesQuery,
  useGetRequesterMozStatsMutation,
  useGetRequesterTaskApplicantsQuery,
  useGetRequesterTaskQuery,
  useGetRequesterTaskTimelineQuery,
  useGetRequesterTasksQuery,
  useLazyGetRequesterTaskApplicantsQuery,
  useLazyGetRequesterTaskQuery,
  useCancelRequesterTaskMutation,
  useReviewRequesterTaskMutation,
  useSelectRequesterTaskProviderMutation,
  useSubmitQualityRubricMutation,
  useUpdateRequesterTaskDeadlineMutation,
  useRespondRequesterDeadlineExtensionMutation,
} = requesterTaskApi;
