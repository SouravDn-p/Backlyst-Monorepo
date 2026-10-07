type UploadParams = {
  file: File;
  generateUploadUrl: any;
};

export const uploadToS3 = async ({
  file,
  generateUploadUrl,
}: UploadParams) => {
  try {
    // Step 1 → Get presigned URL
    const response = await generateUploadUrl({
      fileName: file.name,
      fileType: file.type,
    }).unwrap();

    console.log("response:", response);

    const { url, key } = response;

    console.log("url:", url);
    console.log("key:", key);

    // Step 2 → Upload to S3
    const uploadResponse = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error("S3 upload failed");
    }

    // Step 3 → Return key
    return key;
  } catch (error) {
    console.error(error);
    throw error;
  }
};