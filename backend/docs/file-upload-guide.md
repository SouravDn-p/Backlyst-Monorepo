

# 📁 File Upload Guide (NestJS + Cloudinary)

## Overview

This project uses **Cloudinary** for file storage (with future migration to S3 planned).
All uploads follow a **shared decorator + service utility pattern** to ensure consistency and maintainability.

---

# 1. Upload Flow

## Step 1 — Use Upload Decorators (Multer Memory Storage)

All uploads use **memory storage** (no disk persistence).

📍 Location:

```txt
src/common/decorator/upload-file.decorator.ts
```

### Responsibilities

The decorators handle:

* Multipart parsing
* File type validation
* File size limits
* Attaching file(s) to request object

---

# 2. Available Upload Decorators

## 2.1 Single File Upload

```ts
UploadSingleFile(fieldName?, type?)
```

### Example

```ts
@Post('upload-avatar')
@UploadSingleFile('file', AllowedFileType.IMAGE)
uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  return file;
}
```

---

## 2.2 Multiple Files (Same Field)

```ts
UploadMultipleFiles(fieldName?, maxCount?, type?)
```

### Example

```ts
@Post('upload-images')
@UploadMultipleFiles('files', 5, AllowedFileType.IMAGE)
uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
  return files;
}
```

---

## 2.3 Multiple Fields (Mixed Uploads)

```ts
UploadFileFields(fields: FileFieldConfig[])
```

### Example

```ts
@Post('create-post')
@UploadFileFields([
  { name: 'thumbnail', type: AllowedFileType.IMAGE, maxCount: 1 },
  { name: 'attachments', type: AllowedFileType.PDF, maxCount: 3 },
])
createPost(
  @UploadedFiles()
  files: {
    thumbnail?: Express.Multer.File[];
    attachments?: Express.Multer.File[];
  },
) {
  return files;
}
```

---

# 3. Allowed File Types

```ts
export enum AllowedFileType {
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
  DOC = 'doc',
  AUDIO = 'audio',
  ANY = 'any',
}
```

---

## MIME Validation Rules

| Type  | Allowed MIME Pattern   |
| ----- | ---------------------- |
| IMAGE | `image/*`              |
| VIDEO | `video/*`              |
| PDF   | `application/pdf`      |
| DOC   | MS Word / DOCX formats |
| AUDIO | `audio/*`              |
| ANY   | no restriction         |

---

# 4. Multer Configuration (Shared)

All decorators share the same configuration:

```ts
const storage = memoryStorage();

const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
};
```

---

# 5. Upload to Cloudinary (Service Layer)

After receiving files from decorators, upload using:

```ts
uploadFileToCloudinary(file, options)
```

### Example

```ts
const uploaded = await uploadFileToCloudinary(file, {
  folder: 'profile-images',
});
```

---

## Default Response

```ts
string // secure_url
```

---

## Metadata Response

If `returnMetadata: true`:

```ts
{
  fileUrl: uploadResponse.secure_url,
  filePath: uploadResponse.public_id,
  fileName: safeFileName,
  originalName: file.originalname,
}
```

---

# 6. Full End-to-End Example

```ts
@Post('avatar')
@UploadSingleFile('file', AllowedFileType.IMAGE)
async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
  const uploaded = await uploadFileToCloudinary(file, {
    folder: 'avatars',
    returnMetadata: true,
  });

  return uploaded;
}
```

---

# 7. Key Rules

* Always use the provided decorators (no raw Multer setup in controllers)
* Files are stored in **memory only**
* Validation happens in interceptor layer (before controller execution)
* Cloudinary handles persistence
* Keep logic abstract to support future S3 migration
* Do not implement disk storage anywhere in the codebase
* **Upload decorators → Controller layer**
* **Cloudinary upload utility → Service layer**

---

# 8. File Field Config Type

```ts
export type FileFieldConfig = {
  name: string;
  maxCount?: number;
  type?: AllowedFileType;
};
```

---


