

# 📦 S3 Image Upload & Download Flow (Presigned URL)

This system uses AWS S3 **presigned URLs** to securely upload and retrieve images directly from the client without passing files through the backend.

---

# 1. 📤 Upload Flow

## Step 1 — Request upload URL

Frontend calls backend to generate a presigned upload URL.

### Endpoint

```http
POST /upload-file/single
```

### Request Body

```json
{
  "fileName": "profile-image.png",
  "fileType": "image/png"
}
```

---

## Response

```json
{
  "url": "https://s3-presigned-put-url...",
  "key": "uploads/1715420000-uuid-profile-image.png"
}
```

### Fields

| Field | Meaning                                  |
| ----- | ---------------------------------------- |
| `url` | Presigned **PUT** URL for uploading file |
| `key` | Unique S3 object key (store this in DB)  |

---

# 2. 📤 Step 2 — Upload file to S3 (Frontend)

Frontend must upload file **directly to S3** using the returned `url`.

### ⚠️ Rules

* Must use `PUT`
* Must send **raw binary file**
* ❌ No FormData
* ❌ No JSON
* Content-Type must be `file.type`

---

### Example (fetch)

```ts
await fetch(uploadUrl, {
  method: "PUT",
  headers: {
    "Content-Type": file.type,
  },
  body: file, // raw File / Blob (binary)
});
```

---

# 3. 🧾 Step 3 — Store file reference in backend

After successful upload:

Frontend sends only the **key** to backend to store in database.

Example:

```json
{
  "avatarKey": "uploads/1715420000-uuid-profile-image.png"
}
```

👉 **Important:** Only store `key`, not URL.

---

# 4. 📥 Download / Display Flow

S3 objects are **private**, so frontend must request a temporary access URL.

---

## Option A (Recommended) — Backend generated URL

### Endpoint

```http
POST /upload-file/url/:key
```

### Response

```json
{
  "key": "uploads/1715420000-uuid-profile-image.png",
  "downloadUrl": "https://s3-presigned-get-url..."
}
```

---

## Usage (Frontend)

```ts
const res = await fetch(`/upload-file/url/${key}`);
const data = await res.json();

img.src = data.downloadUrl;
```

---

## ⏳ Expiry

* Download URL validity: **1 day (default)**

---

# 5. 🧠 Backend S3 Service Behavior

## Upload URL generation

Backend creates:

* Sanitized file name
* Sanitized folder (`uploads` default)
* Unique key using UUID + timestamp
* `PutObjectCommand`
* Presigned PUT URL

---

## Download URL generation

Backend uses:

* `GetObjectCommand`
* Generates **presigned GET URL**
* Returns temporary URL (default: 24h)

---

# 6. 🔐 Security Notes

* AWS credentials NEVER exposed to frontend
* S3 bucket must be **private**
* Only presigned URLs allow access
* Always validate `fileType` on backend
* Always store only `key` in DB
* Regenerate download URLs when needed

---

# 7. 🔄 Full Flow Summary

## Upload

```text
Frontend → POST /upload-file/single
        ← { url, key }

Frontend → PUT url (binary file)
        → S3

Frontend → sends key → backend DB store
```

---

## Download

```text
Frontend → POST /upload-file/url/:key
        ← { downloadUrl }

Frontend → uses downloadUrl in UI
```

---

# 8. 💡 Key Idea

* `url` → temporary upload access (PUT)
* `key` → permanent identifier (store in DB)
* `downloadUrl` → temporary view access (GET)

---

