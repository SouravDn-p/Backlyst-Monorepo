"use client";

import { Search, ArrowUpRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGetBlogsQuery } from "@/redux/features/api/blog/blogApi";
import { Blog } from "@/types/blog/blogTypes";

const BlogResources = () => {
  const router = useRouter();
  
  const { data: response, isLoading, isError } = useGetBlogsQuery({ page: 1, limit: 10 });
  const posts: Blog[] = response?.data || [];

  return (
    <section className="py-20 px-6 bg-[#fdfdff]" id="articles">
      <div className="max-w-310 mx-auto flex flex-col items-center gap-10">
        {/* Heading Group */}
        <div className="flex flex-col gap-4 items-center justify-center w-full">
          <div className="inline-flex items-center justify-center bg-[#FFF1E9] border border-[#FEA369] rounded-[30px] px-4 py-2">
            <span className="text-xs font-medium font-inter text-[#FD751F] leading-4.5">
              LATEST POSTS
            </span>
          </div>

          <div className="flex flex-col gap-1 items-center text-center font-sora font-semibold text-[28px] md:text-[36px] leading-[1.35] tracking-[-0.5px]">
            <h2 className="text-gray-900">
              Resources to help you build better backlinks
            </h2>
            <h2>
              <span className="text-gray-900">and </span>
              <span className="text-[#FD751F]">grow organic traffic.</span>
            </h2>
          </div>

          {/* Search bar */}
          <div className="flex items-center w-full max-w-90 mt-2 rounded-full border border-gray-200 bg-white pl-4 pr-1.5 py-1.5">
            <input
              type="text"
              placeholder="Search articles"
              className="flex-1 text-sm font-inter text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            />
            <button
              type="button"
              aria-label="Search"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FD751F] hover:bg-[#e06517] transition-all shrink-0"
            >
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Post Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {posts.map((post) => {
            // Extract description from the blocks array if type is DESCRIPTION, fallback to subtitle
            const descriptionBlock = post.blocks?.find(
              (block) => block.type === "DESCRIPTION"
            );
            const description = descriptionBlock?.content || post.subtitle || "";

            return (
              <article
                key={post.id}
                className="flex flex-col rounded-2xl border border-gray-100/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => router.push(`/blog/${post.id}`)}
              >
                {/* Image with internal padding and rounded corners */}
                <div className="overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={post.thumbnail || "" }
                    alt={post.title}
                    className="h-64 w-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-3 pt-5">
                  {/* Category */}
                  <span className="text-sm font-semibold text-[#FD751F]">
                    {post.category}
                  </span>

                  {/* Title + Arrow Icon */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-sora text-lg font-bold text-gray-900 leading-snug">
                      {post.title}
                    </h3>
                    <ArrowUpRight className="h-5 w-5 shrink-0 text-gray-900 mt-1" />
                  </div>

                  {/* Description */}
                  <p className="font-inter text-sm text-gray-500 leading-relaxed line-clamp-2">
                    {description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Load more */}
        <button
          type="button"
          className="flex items-center gap-2 border border-gray-200 rounded-full px-6 py-3 text-sm font-semibold font-inter text-gray-700 hover:bg-gray-50 transition-all"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Load more</span>
        </button>
      </div>
    </section>
  );
};

export default BlogResources;