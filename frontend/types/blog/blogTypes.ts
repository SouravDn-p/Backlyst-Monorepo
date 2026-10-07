export type BlogBlock = {
    type: "DESCRIPTION" | "MARKDOWN";
    order: number;
    content: string;
};

export type BlogAuthor = {
    id: string;
    name: string;
    email: string;
};

export type Blog = {
    id: string;
    title: string;
    subtitle: string | null;
    thumbnail: string | null;
    tags: string[];
    category: string | null;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    blocks: BlogBlock[];
    authorId: string;
    author: BlogAuthor;
};

export type MetaData = {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export type BlogListResponse = {
    success: boolean;
    statusCode: number;
    message: string;
    data: Blog[];
    meta: MetaData;
};

export type BlogSingleResponse = {
    success: boolean;
    statusCode: number;
    message: string;
    data: Blog;
};
