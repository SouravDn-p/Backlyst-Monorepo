import { baseApi } from "../baseApi";
import type {
  GetDisputesRequest,
  GetDisputesResponse,
  OpenDisputeRequest,
  OpenDisputeResponse,
  ResolveDisputeRequest,
  ResolveDisputeResponse,
} from "@/types/dispute/disputeTypes";

export const disputeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // POST /tasks/:taskId/disputes
    openDispute: builder.mutation<OpenDisputeResponse, OpenDisputeRequest>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/disputes`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Dispute", id: "LIST" },
        { type: "RequesterTask", id: taskId },
        { type: "ProviderTask", id: taskId },
      ],
    }),

    // GET /disputes
    getDisputes: builder.query<GetDisputesResponse, GetDisputesRequest>({
      query: (params) => ({
        url: "/disputes",
        method: "GET",
        params,
      }),
      keepUnusedDataFor: 60,
      providesTags: (result) => {
        const items = result?.data?.items ?? [];
        return items.length
          ? [
              { type: "Dispute" as const, id: "LIST" },
              ...items.map((d) => ({ type: "Dispute" as const, id: d.id })),
            ]
          : [{ type: "Dispute" as const, id: "LIST" }];
      },
    }),

    // POST /admin/disputes/:id/resolve
    resolveDispute: builder.mutation<ResolveDisputeResponse, ResolveDisputeRequest>({
      query: ({ id, ...body }) => ({
        url: `/admin/disputes/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Dispute", id: "LIST" },
        { type: "Dispute", id },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useOpenDisputeMutation,
  useGetDisputesQuery,
  useLazyGetDisputesQuery,
  useResolveDisputeMutation,
} = disputeApi;
