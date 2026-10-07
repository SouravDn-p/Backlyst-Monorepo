import { baseApi } from "../baseApi";

export interface IDirectS3UploadParams {
  file: File;
  folder?: string;
}

export interface IDirectS3UploadResponse {
  url: string;
  key: string;
  downloadUrl?: string;
  fileUrl?: string;
}

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateUploadUrl: builder.mutation({
      query: (body) => ({
        url: "/upload-file/single",
        method: "POST",
        body,
      }),
    }),

    uploadToS3Direct: builder.mutation<IDirectS3UploadResponse, IDirectS3UploadParams>({
      query: ({ file, folder }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (folder) {
          formData.append("folder", folder);
        }
        return {
          url: "/upload-s3/direct",
          method: "POST",
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useGenerateUploadUrlMutation,
  useUploadToS3DirectMutation,
} = uploadApi;