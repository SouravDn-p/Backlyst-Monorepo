"use client";

import { useState } from "react";
import { uploadToS3 } from "@/lib/uploadToS3";
import { useGenerateUploadUrlMutation } from "@/redux/features/api/upload/uploadApi";

export const useS3Upload = () => {
  const [loading, setLoading] = useState(false);

  const [generateUploadUrl] =
    useGenerateUploadUrlMutation();

  const uploadImage = async (file: File) => {
    try {
      setLoading(true);

      const key = await uploadToS3({
        file,
        generateUploadUrl,
      });

      return key;
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadImage,
    loading,
  };
};