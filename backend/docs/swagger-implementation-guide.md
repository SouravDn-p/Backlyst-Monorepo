# Swagger Implementation Guide

This guide explains how Swagger is configured and how to properly annotate your endpoints.

---

## 🔒 Authentication (Lock Icon Behavior)

* By default, **all routes are protected** and will show the 🔒 lock icon in Swagger.
* To **disable authentication for a specific route**, use:

```ts
@ApiOperation({ security: [] })
```

This marks the endpoint as public.

---

## 📁 File Upload Handling

To enable file upload in Swagger:

### 1. Use the upload decorator

Import and use the appropriate decorator from:

```
src/common/decorator/upload-file.decorator.ts
```

### 2. Define file in DTO

```ts
@ApiProperty({
  type: 'string',
  format: 'binary',
})
file?: Express.Multer.File;
```

### ⚠️ Important Rules

* Do **not** use class-validator decorators on file fields.
* Swagger will automatically render a file input box.

---

## 🧾 DTO Swagger Auto-generation

We use custom decorators for cleaner Swagger generation.

### Required fields

Use:

```ts
@ApiProperty({
  description: 'Description here',
  example: 'Example value',
  name: 'fieldName',
})
```

---

### Optional fields

Use:

```ts
@ApiPropertyOptional({
  description: 'Description here',
  example: 'Example value',
})
```

---

## 📌 Controller Parameters

### Path Parameters

Use:

```ts
@ApiParam({
  name: 'id',
  description: 'User ID',
  example: '123',
})
```

---

### Query Parameters

Use:

```ts
@ApiQuery({
  name: 'page',
  required: false,
  example: 1,
  description: 'Page number',
})
```

---

## 🔑 Using Authentication in Swagger

1. Run the API and open Swagger UI.
2. Click the **🔒 Authorize** button at the top.
3. Paste your **access token**.
4. Swagger will automatically attach it to all protected requests.

---

## ✅ Summary

* 🔒 All routes are protected by default
* Use `security: []` to make routes public
* Use `@ApiProperty` / `@ApiPropertyOptional` for DTO documentation
* Use `@ApiParam` for path params
* Use `@ApiQuery` for query params
* Use file decorator + `binary` format for uploads
* Use Swagger Authorize button for token-based auth
