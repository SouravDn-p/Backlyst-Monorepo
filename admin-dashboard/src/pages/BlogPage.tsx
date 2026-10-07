import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, FileText, Image as ImageIcon, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useDeleteBlogMutation, useGetAdminBlogsQuery, type BlogPost } from "../redux/feature/blog/blogApi";
import { usePermissions } from "../utils/usePermissions";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: { message?: string | string[] } | string }).data;
    if (typeof data === "string") return data;
    if (data?.message) return Array.isArray(data.message) ? data.message.join(" ") : data.message;
  }
  return error instanceof Error ? error.message : fallback;
};

const getShortDescription = (blog: BlogPost) => {
  const description = blog.blocks?.find((block) => block.type === "DESCRIPTION");
  return description?.content || blog.subtitle || "";
};

const BlogThumbnail = ({ blog }: { blog: BlogPost }) => {
  const [failed, setFailed] = useState(false);

  if (!blog.thumbnail || failed) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F5F7FA] text-gray-300">
        <ImageIcon size={48} strokeWidth={1.25} />
      </div>
    );
  }

  return (
    <img
      src={blog.thumbnail}
      alt={blog.title}
      className="w-full h-full object-cover"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
};

const BlogPage = () => {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can("BLOG", "canCreate");
  const canUpdate = can("BLOG", "canUpdate");
  const canDelete = can("BLOG", "canDelete");
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useGetAdminBlogsQuery({ page, limit: 10 });
  const [deleteBlog, { isLoading: isDeleting }] = useDeleteBlogMutation();

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;

    try {
      await deleteBlog(id).unwrap();
      void refetch();
    } catch (err) {
      alert(getApiErrorMessage(err, "Failed to delete blog post."));
    }
  };

  const blogs = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-bold text-[#000000] uppercase tracking-wide">Blog Management</h2>
          <p className="text-[13px] font-medium text-gray-500 mt-1">Create, edit, and manage Markdown blog posts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 h-10 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wider border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} /> Refresh
          </button>
          {canCreate && (
            <button onClick={() => navigate("/blogs/create")} className="flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#1447E6" }}>
              <Plus size={18} /> Create Blog
            </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-10"><span className="text-gray-400 font-bold uppercase text-sm tracking-wider">Loading Blogs...</span></div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="text-red-500 font-bold uppercase text-sm tracking-wider flex items-center gap-2"><AlertCircle size={18} /> Failed to load blogs.</span>
            <button onClick={() => refetch()} className="h-10 px-4 rounded-lg border border-gray-200 text-[12px] font-bold uppercase tracking-wider hover:bg-gray-50">Retry</button>
          </div>
        ) : blogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4"><FileText size={32} className="text-gray-300" /></div>
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide">No Blogs Found</h3>
            <p className="text-sm text-gray-500 mt-2">No blog posts have been published yet.</p>
            {canCreate && (
              <button onClick={() => navigate("/blogs/create")} className="mt-6 flex items-center gap-2 h-10 px-5 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#1447E6" }}><Plus size={18} /> Create First Blog</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <div key={blog.id} className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all bg-white flex flex-col">
                <div
                  className={`relative h-48 bg-gray-100 flex-shrink-0 ${canUpdate ? "cursor-pointer" : ""}`}
                  onClick={() => canUpdate && navigate(`/blogs/edit/${blog.id}`)}
                >
                  <BlogThumbnail blog={blog} />
                  {blog.category && <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-bold text-[#1447E6] uppercase tracking-wider">{blog.category}</span>}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3
                    className={`text-[16px] font-bold text-gray-900 line-clamp-2 leading-tight mb-2 ${canUpdate ? "cursor-pointer hover:text-brand-indigo transition-colors" : ""}`}
                    onClick={() => canUpdate && navigate(`/blogs/edit/${blog.id}`)}
                  >{blog.title}</h3>
                  {getShortDescription(blog) && <p className="text-[13px] text-gray-500 line-clamp-2 mb-4">{getShortDescription(blog)}</p>}
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{blog.author?.name ? blog.author.name.charAt(0).toUpperCase() : "A"}</div>
                      <div className="text-[11px] font-medium text-gray-500"><p className="text-gray-900 font-bold uppercase tracking-wider">{blog.author?.name || "Admin"}</p><p>{new Date(blog.createdAt).toLocaleDateString()}</p></div>
                    </div>
                    {(canUpdate || canDelete) && (
                      <div className="flex gap-2">
                        {canUpdate && <button onClick={() => navigate(`/blogs/edit/${blog.id}`)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit Blog"><Pencil size={16} /></button>}
                        {canDelete && <button onClick={() => handleDelete(blog.id)} disabled={isDeleting} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50" title="Delete Blog"><Trash2 size={16} /></button>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-gray-50">Prev</button>
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Page {page} of {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((prev) => prev + 1)} className="h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-bold uppercase tracking-wider disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
