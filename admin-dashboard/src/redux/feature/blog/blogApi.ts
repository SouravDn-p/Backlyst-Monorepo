import { baseApi } from "../../baseApi";

export interface BlogAuthor {
  id: string;
  name: string;
  email: string;
}

export interface BlogBlock {
  type: string;
  content?: string;
  url?: string;
  order: number;
  [key: string]: any;
}

export interface BlogPost {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  tags: string[];
  category?: string;
  blocks: BlogBlock[];
  authorId: string;
  author: BlogAuthor;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetBlogsResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: BlogPost[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetBlogResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: BlogPost;
}

export const blogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminBlogs: builder.query<GetBlogsResponse, { page?: number; limit?: number }>({
      query: (params) => ({
        url: "/blog/admin/all",
        method: "GET",
        params,
      }),
      providesTags: ["Blog"],
    }),
    getAdminBlogById: builder.query<GetBlogResponse, string>({
      query: (id) => ({
        url: `/blog/admin/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Blog", id }],
    }),
    createMarkdownBlog: builder.mutation<any, FormData>({
      query: (data) => ({
        url: "/blog/markdown",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Blog"],
    }),
    updateMarkdownBlog: builder.mutation<any, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `/blog/admin/markdown/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Blog"],
    }),
    deleteBlog: builder.mutation<any, string>({
      query: (id) => ({
        url: `/blog/admin/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Blog"],
    }),
    uploadDirectMedia: builder.mutation<any, FormData>({
      query: (data) => ({
        url: "/upload-s3/direct",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useGetAdminBlogsQuery,
  useGetAdminBlogByIdQuery,
  useCreateMarkdownBlogMutation,
  useUpdateMarkdownBlogMutation,
  useDeleteBlogMutation,
  useUploadDirectMediaMutation,
} = blogApi;
