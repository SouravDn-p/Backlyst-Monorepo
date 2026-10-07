import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Paperclip,
  PenLine,
  Eye
} from "lucide-react";
import {
  useCreateMarkdownBlogMutation,
  useUpdateMarkdownBlogMutation,
  useGetAdminBlogByIdQuery,
  useUploadDirectMediaMutation
} from "../redux/feature/blog/blogApi";

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: any }).data;
    if (typeof data === "string") return data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(" ") : data.message;
    }
  }
  return error instanceof Error ? error.message : fallback;
};

type MobileViewMode = "write" | "preview";

const BlogFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const { data: blogData, isLoading: isFetching } = useGetAdminBlogByIdQuery(id as string, {
    skip: !isEditing,
  });

  const [createBlog, { isLoading: isCreating }] = useCreateMarkdownBlogMutation();
  const [updateBlog, { isLoading: isUpdating }] = useUpdateMarkdownBlogMutation();
  const [uploadMedia, { isLoading: isUploadingMedia }] = useUploadDirectMediaMutation();

  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>("write");

  // Form State
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [content, setContent] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaPickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && blogData?.data) {
      const blog = blogData.data;
      setTitle(blog.title || "");
      setSubtitle(blog.subtitle || "");
      setCategory(blog.category || "");
      setTags((blog.tags || []).join(", "));
      setThumbnailPreview(blog.thumbnail || null);

      const descBlock = blog.blocks?.find((b: any) => b.type === "DESCRIPTION");
      if (descBlock) setShortDescription(descBlock.content || "");

      const contentBlock = blog.blocks?.find((b: any) => b.type === "MARKDOWN");
      if (contentBlock) setContent(contentBlock.content || "");
    }
  }, [isEditing, blogData]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleInsertMediaClick = () => {
    mediaPickerRef.current?.click();
  };

  const handleMediaPickerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);
    const isVideo = file.type.startsWith('video/');
    const folderName = isVideo ? 'blog-video' : 'blog-image';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folderName);

    try {
      const res = await uploadMedia(formData).unwrap();
      const downloadUrl = res.url || res.downloadUrl;

      if (!downloadUrl) throw new Error("Invalid response from server.");

      let insertText = '';
      if (isVideo) {
        insertText = `\n<video width="100%" controls>\n  <source src="${downloadUrl}" type="${file.type}">\n  Your browser does not support the video tag.\n</video>\n`;
      } else {
        insertText = `\n![image](${downloadUrl})\n`;
      }

      if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newContent = content.substring(0, start) + insertText + content.substring(end);
        setContent(newContent);

        // Reset cursor
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = start + insertText.length;
            textareaRef.current.selectionEnd = start + insertText.length;
          }
        }, 10);
      } else {
        setContent(content + insertText);
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, "Failed to upload media."));
    } finally {
      e.target.value = ''; // clear input
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim() || !content.trim()) {
      setFormError("Title and Markdown content are required.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    if (subtitle) formData.append("subtitle", subtitle);
    if (category) formData.append("category", category);
    if (tags) formData.append("tags", tags);
    if (shortDescription) formData.append("shortDescription", shortDescription);
    formData.append("content", content);
    if (thumbnailFile) {
      formData.append("thumbnail", thumbnailFile);
    }

    try {
      if (isEditing) {
        await updateBlog({ id: id!, data: formData }).unwrap();
        setFormSuccess("Blog post updated successfully.");
      } else {
        await createBlog(formData).unwrap();
        setFormSuccess("Blog post created successfully.");
      }
      setTimeout(() => {
        navigate("/blogs");
      }, 1500);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to save blog post."));
    }
  };

  const isLoading = isCreating || isUpdating;

  if (isEditing && isFetching) {
    return (
      <div className="flex flex-col h-[60vh] bg-white rounded-2xl shadow-sm border border-gray-200 items-center justify-center">
        <span className="text-gray-400 font-bold uppercase text-sm tracking-wider animate-pulse">
          Loading Blog Details...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] relative font-sans">

      {/* Top Navigation Bar (Outside Card) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-6 sticky top-0 z-50 bg-[#F9FAFB]/80 backdrop-blur-md py-4 gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/blogs")}
            className="w-10 h-10 flex items-center justify-center text-[#717680] hover:text-[#0A0A0A] transition-colors rounded-full hover:bg-gray-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-[24px] font-bold leading-[32px] text-[#0A0A0A]">
              {isEditing ? "Edit Blog Post" : "Create Blogs"}
            </h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-[12px] ">
          <button
            type="button"
            onClick={() => navigate("/blogs")}
            disabled={isLoading}
            className="py-[8px] w-full md:w-fit px-[60px] border border-[#A4A7AE] rounded-[4px] text-[14px] font-medium leading-[20px] text-[#717680] bg-white hover:bg-[#331FFD] hover:text-[#FFFFFF] hover:border-[#331FFD] transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="py-[8px] w-full md:w-fit px-[60px] border border-[#A4A7AE] rounded-[4px] text-[14px] font-medium  leading-[20px] text-[#717680] bg-white hover:bg-[#331FFD] hover:text-[#FFFFFF] hover:border-[#331FFD] transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              isEditing ? "Save Changes" : "Publish"
            )}
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-8">
        <form id="blog-form" onSubmit={handleSubmit} className="w-full mx-auto space-y-6">

          {formError && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-[14px] font-medium text-red-600 flex items-center gap-2">
              <AlertCircle size={18} />
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-100 text-[14px] font-medium text-green-600 flex items-center gap-2">
              <CheckCircle2 size={18} />
              {formSuccess}
            </div>
          )}

          <h2 className="text-[18px] font-medium text-[#000000] mb-5">Write your Blog</h2>

          {/* Title */}
          <div>
            <label className=" font-semibold text-[18px] leading-7 text-[#535862]">
              Blog Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-2 border border-dashed border-[#C8CCD1] rounded-md p-3 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all bg-white"
              placeholder="e.g. How to use React with Tailwind"
              required
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2">
              Subtitle
            </label>
            <input
              type="text"
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full mt-2 border border-dashed border-[#C8CCD1] rounded-md p-3 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all bg-white"
              placeholder="Optional: A catchy subtitle for the blog post"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2">
              Short Description
            </label>
            <textarea
              id="short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={3}
              className="w-full border border-dashed border-[#C8CCD1] rounded-md p-3 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all resize-y bg-[#FAFAFA]"
              placeholder="Brief summary of the blog post (shown in cards and SEO)"
            />
          </div>

          {/* Category & Tags Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-dashed border-[#C8CCD1] rounded-md p-3 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all bg-white"
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full border border-dashed border-[#C8CCD1] rounded-md p-3 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all bg-white"
                placeholder="e.g. react, tutorial, web (comma separated)"
              />
            </div>
          </div>

          {/* Optional Thumbnail upload */}
          <div>
            <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2">
              Cover Image
            </label>
            <div className="relative w-full max-w-[300px] h-32 border border-dashed border-[#C8CCD1] rounded-md flex flex-col items-center justify-center bg-[#FAFAFA] hover:bg-gray-100 transition-colors overflow-hidden group">
              {thumbnailPreview ? (
                <>
                  <img src={thumbnailPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-[12px] font-bold flex items-center gap-2">
                      <ImageIcon size={14} /> Change Cover
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-[#667085]">
                  <ImageIcon size={20} className="mb-1" />
                  <span className="text-[12px] font-medium">Upload Image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Blog Content & Live Preview Section */}
          <div className="pt-4">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
              <label className="font-inter font-semibold text-[18px] leading-7 text-[#535862] block mb-2 sm:mb-0">
                Blog Content & Live Preview
              </label>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Mobile View Toggles (Only visible on small screens) */}
                <div className="lg:hidden flex bg-gray-100 p-1 rounded-md w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("write")}
                    className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 sm:py-1 rounded text-[12px] font-bold transition-all ${mobileViewMode === "write" ? "bg-white text-[#344054] shadow-sm" : "text-[#667085]"
                      }`}
                  >
                    <PenLine size={14} /> Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileViewMode("preview")}
                    className={`flex-1 sm:flex-none flex justify-center items-center gap-1.5 px-3 py-2 sm:py-1 rounded text-[12px] font-bold transition-all ${mobileViewMode === "preview" ? "bg-white text-[#344054] shadow-sm" : "text-[#667085]"
                      }`}
                  >
                    <Eye size={14} /> Preview
                  </button>
                </div>

                <input
                  type="file"
                  ref={mediaPickerRef}
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                  onChange={handleMediaPickerChange}
                />
                <button
                  type="button"
                  onClick={handleInsertMediaClick}
                  disabled={isUploadingMedia}
                  className="flex items-center justify-center gap-[10px] py-[12px] px-[20px] rounded bg-[#181D27] hover:bg-black text-[#FFFFFF] text-[12px] font-bold transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                >
                  {isUploadingMedia ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip size={14} /> <span className="hidden sm:inline">Insert Media (Video/Image)</span><span className="sm:hidden">Insert Media</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split Screen Layout (Desktop) / Tabbed (Mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Left Column: Markdown Editor */}
              <div className={`${mobileViewMode === "write" ? "block" : "hidden"} lg:block`}>
                <textarea
                  ref={textareaRef}
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[500px] h-[calc(100vh-450px)] border border-dashed border-[#C8CCD1] rounded-md p-4 text-[14px] text-[#101828] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#84ADFF] focus:ring-1 focus:ring-[#84ADFF] transition-all resize-y font-mono bg-[#FAFAFA]"
                  placeholder="# Enter your markdown content here..."
                  required
                />
              </div>

              {/* Right Column: Live Preview */}
              <div className={`${mobileViewMode === "preview" ? "block" : "hidden"} lg:block`}>
                <div className="w-full h-full min-h-[500px] border border-dashed border-[#C8CCD1] rounded-md p-6 lg:p-8 bg-[#FAFAFA] overflow-y-auto max-h-[calc(100vh-450px)] custom-scrollbar">

                  {/* Dynamic Title Preview inside the live preview container */}
                  {title && (
                    <div className="mb-6 text-center">
                      <h1 className="text-3xl font-extrabold text-[#101828] mb-2">{title}</h1>
                      {subtitle && <p className="text-[#667085] text-lg">{subtitle}</p>}
                    </div>
                  )}

                  {/* Cover Image Preview */}
                  {thumbnailPreview && (
                    <div className="mb-8 rounded-lg overflow-hidden border border-[#EAECF0] bg-[#FAFAFA]">
                      <img src={thumbnailPreview} alt="Cover Preview" className="w-full h-auto object-cover max-h-[400px]" />
                    </div>
                  )}

                  <div className="prose prose-indigo max-w-none 
                    prose-headings:font-bold prose-headings:text-[#101828]
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                    prose-p:text-[#344054] prose-p:leading-relaxed
                    prose-a:text-[#1447E6] prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-lg prose-img:border prose-img:border-[#EAECF0]
                    prose-pre:bg-[#101828] prose-pre:text-[#F2F4F7] prose-pre:rounded-md
                  ">
                    {content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-[#98A2B3] italic text-[14px]">Preview will appear here...</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </form>
      </div>

      {/* Basic Fallback Styles just in case tailwind typography isn't installed properly */}
      <style>{`
        .prose h1, .prose h2, .prose h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
        .prose p { margin-top: 1em; margin-bottom: 1em; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
        .prose li { margin-top: 0.25em; margin-bottom: 0.25em; }
        .prose pre { overflow-x: auto; padding: 1em; margin-top: 1em; margin-bottom: 1em; }
        .prose pre code { background-color: transparent; padding: 0; color: inherit; font-size: inherit; }
      `}</style>
    </div>
  );
};

export default BlogFormPage;

