import { baseApi } from "../../baseApi";

export type AdminProfileSession = {
  id: string;
  ipAddress?: string | null;
  device?: string | null;
  userAgent?: string | null;
  loginAt?: string | null;
  logoutAt?: string | null;
};

/** One section permission entry from the backend */
export type AdminPermission = {
  section: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

/** Authorization metadata returned in /auth/me for admin users */
export type AdminAuthorization = {
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
};

export type AdminProfile = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  status?: string | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  sessions?: AdminProfileSession[];
  /** Present only for ADMIN and SUPER_ADMIN roles */
  authorization?: AdminAuthorization;
  [key: string]: unknown;
};

export type AdminProfileResponse = {
  success: boolean;
  message: string;
  data: AdminProfile;
};

export const adminProfileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminMe: builder.query<AdminProfileResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["AdminProfile"],
    }),
  }),
});

export const { useGetAdminMeQuery } = adminProfileApi;
