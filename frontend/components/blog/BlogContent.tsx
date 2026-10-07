import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
    // Images render as a figure with the alt text shown as a caption,
    // matching "Image courtesy of ..." captions in the design.
    img: ({ src, alt }) => (
        <figure className="my-8">
            <img
                src={src}
                alt={alt}
                className="w-full h-auto rounded-xl object-cover"
            />
            {alt && (
                <figcaption className="mt-2.5 text-center text-xs font-inter text-gray-400">
                    {alt}
                </figcaption>
            )}
        </figure>
    ),
    blockquote: ({ children }) => (
        <blockquote className="my-8 border-l-2 border-primary pl-6 font-sora text-xl md:text-2xl font-medium text-gray-900 leading-snug">
            {children}
        </blockquote>
    ),
    h2: ({ children }) => (
        <h2 className="mt-12 mb-4 font-sora font-semibold text-2xl text-gray-900">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 className="mt-8 mb-3 font-sora font-semibold text-xl text-gray-900">
            {children}
        </h3>
    ),
    p: ({ children }) => (
        <p className="mb-5 font-inter text-base text-gray-600 leading-7">
            {children}
        </p>
    ),
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80"
        >
            {children}
        </a>
    ),
    ul: ({ children }) => (
        <ul className="mb-5 list-disc pl-6 space-y-2 font-inter text-base text-gray-600 leading-7">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="mb-5 list-decimal pl-6 space-y-2 font-inter text-base text-gray-600 leading-7">
            {children}
        </ol>
    ),
    hr: () => <hr className="my-10 border-gray-200" />,
    table: ({ children }) => (
        <div className="my-6 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm font-inter text-left">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-gray-50 text-gray-900 font-semibold">
            {children}
        </thead>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 border-b border-gray-200">{children}</th>
    ),
    td: ({ children }) => (
        <td className="px-4 py-3 border-b border-gray-100 text-gray-600 align-top">
            {children}
        </td>
    ),
    code: ({ children }) => (
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800">
            {children}
        </code>
    ),
    pre: ({ children }) => (
        <pre className="my-6 rounded-xl bg-gray-900 text-gray-100 p-5 overflow-x-auto text-sm font-mono">
            {children}
        </pre>
    ),
};

const BlogContent = ({ content }: { content: string }) => {
    return (
        <div className="max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default BlogContent;