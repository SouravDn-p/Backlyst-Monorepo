import { baseApi } from "../baseApi";
import type {
  CreateDirectTaskRequest,
  CreateDirectTaskResponse,
  GetDirectTasksRequest,
  PaginatedDirectTasksResponse,
  AcceptDirectTaskRequest,
  RejectDirectTaskRequest,
  CancelDirectTaskRequest,
  ActionDirectTaskResponse,
} from "@/types/directTask/directTaskTypes";

export const directTaskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createDirectTask: builder.mutation<
      CreateDirectTaskResponse,
      CreateDirectTaskRequest
    >({
      query: ({ data, files = [] }) => {
        const formData = new FormData();

        formData.append("data", JSON.stringify(data));

        files.forEach((file) => {
          formData.append("files", file);
        });

        return {
          url: "/task-request",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "RequesterWebsite", id: "LIST" }],
    }),
    getSentDirectTasks: builder.query<
      PaginatedDirectTasksResponse,
      GetDirectTasksRequest
    >({
      query: (params) => ({
        url: "/task-request/sent",
        params,
      }),
      providesTags: ["DirectTask"],
    }),
    getReceivedDirectTasks: builder.query<
      PaginatedDirectTasksResponse,
      GetDirectTasksRequest
    >({
      query: (params) => ({
        url: "/task-request/received",
        params,
      }),
      providesTags: ["DirectTask"],
    }),
    getDirectTaskById: builder.query<
      ActionDirectTaskResponse,
      string
    >({
      query: (id) => `/task-request/${id}`,
      providesTags: (result, error, id) => [{ type: "DirectTask", id }],
    }),
    acceptDirectTask: builder.mutation<
      ActionDirectTaskResponse,
      AcceptDirectTaskRequest
    >({
      query: ({ id, data }) => ({
        url: `/task-request/${id}/accept`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["DirectTask", "ProviderTask"],
    }),
    rejectDirectTask: builder.mutation<
      ActionDirectTaskResponse,
      RejectDirectTaskRequest
    >({
      query: ({ id, data }) => ({
        url: `/task-request/${id}/reject`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["DirectTask"],
    }),
    cancelDirectTask: builder.mutation<
      ActionDirectTaskResponse,
      CancelDirectTaskRequest
    >({
      query: ({ id, data }) => ({
        url: `/task-request/${id}/cancel`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["DirectTask", "RequesterWebsite"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateDirectTaskMutation,
  useGetSentDirectTasksQuery,
  useGetReceivedDirectTasksQuery,
  useGetDirectTaskByIdQuery,
  useAcceptDirectTaskMutation,
  useRejectDirectTaskMutation,
  useCancelDirectTaskMutation,
} = directTaskApi;
