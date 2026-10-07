
import { baseApi } from "@/redux/baseApi";
import {
  AdminTaskListParams,
  AdminTaskListResponse,
  AdminTaskActionRequest,
  AdminTaskActionResponse,
} from "./taskTypes";


export const taskApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminTasks: builder.query<AdminTaskListResponse, AdminTaskListParams | void>({
      query: (params) => ({
        url: "/admin-task/all",
        params: params || {},
      }),
      providesTags: ["Task"],
    }),
    runAdminTaskAction: builder.mutation<AdminTaskActionResponse, AdminTaskActionRequest>({
      query: ({ taskId, ...body }) => ({
        url: `/admin-task/${taskId}/action`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Task"],
    }),
  }),
});

export const { useGetAdminTasksQuery, useRunAdminTaskActionMutation } = taskApi;
