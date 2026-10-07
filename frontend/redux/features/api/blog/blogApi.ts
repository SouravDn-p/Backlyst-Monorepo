import { baseApi } from "../baseApi";
import { BlogListResponse, BlogSingleResponse } from "@/types/blog/blogTypes";

export const blogApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getBlogs: builder.query<BlogListResponse, { page?: number; limit?: number }>({
            query: ({ page = 1, limit = 10 }) => ({
                url: `/blog?page=${page}&limit=${limit}`,
                method: "GET",
            }),
            providesTags: ["Blog"],
        }),
        getBlogById: builder.query<BlogSingleResponse, string>({
            query: (id) => ({
                url: `/blog/${id}`,
                method: "GET",
            }),
            providesTags: ["Blog"],
        }),
    }),
});

export const { useGetBlogsQuery, useGetBlogByIdQuery } = blogApi;
