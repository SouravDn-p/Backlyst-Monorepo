import { baseApi } from "../../baseApi";
import type { AdminPermission } from "../auth/adminProfileApi";

// ─── Response Types ───────────────────────────────────────────────────────────

export type AuthorizationSectionsResponse = {
  success: boolean;
  message: string;
  data: {
    sections: string[];
    actions: string[];
  };
};

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  companyName?: string | null;
  country?: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
  status: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present when fetching a single admin detail */
  authorization?: {
    isSuperAdmin: boolean;
    permissions: AdminPermission[];
  };
};

export type AdminListResponse = {
  success: boolean;
  message: string;
  data: {
    admins: AdminAccount[];
  };
};

export type AdminDetailResponse = {
  success: boolean;
  message: string;
  data: {
    admin: AdminAccount;
  };
};

export type AdminMutationResponse = {
  success: boolean;
  message: string;
  data: {
    admin: AdminAccount;
  };
};

export type ReplacePermissionsResponse = {
  success: boolean;
  message: string;
  data: {
    permissions: AdminPermission[];
  };
};

// ─── Request Types ────────────────────────────────────────────────────────────

export type CreateAdminDto = {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  companyName?: string;
  permissions?: AdminPermission[];
};

export type UpdateAdminDto = {
  name?: string;
  phoneNumber?: string;
  companyName?: string;
  country?: string;
  status?: string;
};

export type ReplaceAdminPermissionsDto = {
  id: string;
  permissions: AdminPermission[];
  reason?: string;
};

// ─── API Slice ────────────────────────────────────────────────────────────────

export const authorizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Fetch all authorization section names and available actions */
    getAuthorizationSections: builder.query<AuthorizationSectionsResponse, void>({
      query: () => ({
        url: "/admin/authorization/sections",
        method: "GET",
      }),
      providesTags: ["AuthorizationSections"],
    }),

    /** List all non-deleted admin accounts */
    getAdminList: builder.query<AdminListResponse, void>({
      query: () => ({
        url: "/admin/authorization/admins",
        method: "GET",
      }),
      providesTags: ["AdminList"],
    }),

    /** Fetch a single admin by ID (includes authorization details) */
    getAdminById: builder.query<AdminDetailResponse, string>({
      query: (id) => ({
        url: `/admin/authorization/admins/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "AdminDetail", id }],
    }),

    /** Create a new normal ADMIN account (super admin only) */
    createAdmin: builder.mutation<AdminMutationResponse, CreateAdminDto>({
      query: (body) => ({
        url: "/admin/authorization/admins",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AdminList"],
    }),

    /** Update editable profile fields for a normal admin */
    updateAdmin: builder.mutation<AdminMutationResponse, { id: string; body: UpdateAdminDto }>({
      query: ({ id, body }) => ({
        url: `/admin/authorization/admins/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "AdminList",
        { type: "AdminDetail", id },
      ],
    }),

    /** Soft-delete a normal admin and remove their permission rows */
    deleteAdmin: builder.mutation<AdminMutationResponse, string>({
      query: (id) => ({
        url: `/admin/authorization/admins/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        "AdminList",
        { type: "AdminDetail", id },
      ],
    }),

    /** Replace the entire permission matrix for one normal admin */
    replaceAdminPermissions: builder.mutation<ReplacePermissionsResponse, ReplaceAdminPermissionsDto>({
      query: ({ id, permissions, reason }) => ({
        url: `/admin/authorization/admins/${id}/permissions`,
        method: "PUT",
        body: { permissions, ...(reason ? { reason } : {}) },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AdminDetail", id },
        "AdminList",
      ],
    }),
  }),
});

export const {
  useGetAuthorizationSectionsQuery,
  useGetAdminListQuery,
  useGetAdminByIdQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
  useReplaceAdminPermissionsMutation,
} = authorizationApi;
