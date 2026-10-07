import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogContent from "@/components/blog/BlogContent";

import { Blog, BlogBlock, BlogSingleResponse } from "@/types/blog/blogTypes";

const API_BASE_URL = "https://api.backlyst.co.uk";

async function getBlogById(id: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/blog/${id}`, {
      next: { revalidate: 300 }, // ISR: refresh every 5 minutes
    });

    if (!res.ok) return null;

    const json: BlogSingleResponse = await res.json();
    if (!json.success) return null;

    return json.data;
  } catch (error) {
    console.error("Failed to fetch blog:", error);
    return null;
  }
}

function getBlockContent(blog: Blog, type: BlogBlock["type"]): string {
  return blog.blocks.find((b) => b.type === type)?.content ?? "";
}

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  return `Published ${formatted}`;
}

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlogById(id);

  if (!blog) {
    return { title: "Blog post not found" };
  }

  const description = getBlockContent(blog, "DESCRIPTION");

  return {
    title: blog.title,
    description: description || blog.subtitle || undefined,
    openGraph: {
      title: blog.title,
      description: description || blog.subtitle || undefined,
      images: blog.thumbnail ? [blog.thumbnail] : undefined,
      type: "article",
      publishedTime: blog.publishedAt,
      authors: blog.author?.name ? [blog.author.name] : undefined,
    },
  };
}

export default async function BlogDetailsPage({ params }: Props) {
  const { id } = await params;
  const blog = await getBlogById(id);

  if (!blog) {
    notFound();
  }

  const shortDescription = getBlockContent(blog, "DESCRIPTION");
  const markdownContent = getBlockContent(blog, "MARKDOWN");

  return (
    <article className="bg-[#fdfdff]">
      <div className="max-w-320 mx-auto px-6 pt-32 pb-24">
        {/* Meta header */}
        <header className="flex flex-col items-center text-center gap-3 mb-10">
          <span className="text-xs font-semibold font-inter text-primary uppercase tracking-wide">
            {formatPublishedDate(blog.publishedAt)}
          </span>

          <h1 className="font-sora font-bold text-3xl md:text-[40px] leading-tight text-gray-900 max-w-160">
            {blog.title}
          </h1>

          {blog.subtitle && (
            <p className="font-inter text-base md:text-lg text-gray-500 leading-7 max-w-140">
              {blog.subtitle}
            </p>
          )}
        </header>

        {/* Thumbnail */}
        {blog.thumbnail && (
          <div className="w-full rounded-2xl overflow-hidden mb-10">
            <img
              src={blog.thumbnail}
              alt={blog.title}
              className="w-full h-[500px] object-cover"
            />
          </div>
        )}

        {/* Short description */}
        {shortDescription && (
          <p className="font-inter text-base text-gray-600 leading-7 mb-10">
            {shortDescription}
          </p>
        )}

        {/* Markdown body */}
        {markdownContent && <BlogContent content={markdownContent} />}

        {/* Author */}
        {blog.author?.name && (
          <div className="mt-16 pt-6 border-t border-gray-200 flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#EEF0FF] font-sora font-semibold text-primary text-sm">
              {blog.author.name.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="font-inter font-semibold text-sm text-gray-900">
                {blog.author.name}
              </span>
              <span className="font-inter text-xs text-gray-400">Author</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
